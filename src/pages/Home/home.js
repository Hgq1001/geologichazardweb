/**
 * @Author:hgq
 * @Date: 2019/4/9
 * @Describe:
 */

import React, { Component } from 'react';
import { connect } from 'dva';
import styles from './home.css';
import { DatePicker } from 'antd';
import { LocaleProvider } from 'antd';
import zh_CN from 'antd/lib/locale-provider/zh_CN';
import moment from 'moment';
import * as utils from '../../utils/utils';
import OptionFilter from '@/components/OptionFilter/OptionFilter';

import Map from 'ol/Map';
import View from 'ol/View';
import FormatGeoJson from 'ol/format/GeoJSON';
import Feature from 'ol/Feature';
import Overlay from 'ol/Overlay';
import * as Extent from 'ol/extent';
import * as Source from 'ol/source';
import * as Proj from 'ol/proj';
import * as OlStyles from 'ol/style';
import * as Layer from 'ol/layer';
import * as Geom from 'ol/geom';
import * as Interaction from 'ol/interaction';
import * as Control from 'ol/control';
import * as Coordinate from 'ol/coordinate';
import 'ol/ol.css';
import { message } from 'antd';
import { saveAs } from 'file-saver';

import cqGeojson from '../../assets/mapData/chongqing.geojson';
import river from '../../assets/mapData/river.geojson';
import Toolbox from '@/components/Toolbox/Toolbox';
import ColorBar from '@/components/ColorBar/ColorBar';


const provinceStyle = (feature, resolution) => {
  return new OlStyles.Style({
    stroke: new OlStyles.Stroke({
      color: 'rga(170,170,170)',
      width: 1,
    }),
    fill: new OlStyles.Fill({
      color: 'rgba(255,255,255,1)',
    }),
    text: new OlStyles.Text({
      exceedLength: false,
      textAlign: 'center',
      textBaseline: 'middle',
      font: 'normal 14px 微软雅黑',
      fill: new OlStyles.Fill({
        color: 'rab(170,170,170)',
      }),
      text: feature.getProperties().NAME,
    }),
    zIndex: 1,
  });
};


const revokeObj = {
  revokeFlag: (data, flag, maxNum = 3) => {
    if (flag === 0) {
      return message.warning('当前没有数据存储版本！');
    } else {
      return this.revokeData(data);
    }
  },
  revokeData: (data) => {

  },
};

@connect((store) => ({
  home: store.home,
}))

class Home extends Component {
  // 构造
  constructor(props) {
    super(props);
    // 初始状态
    this.state = {
      date: utils.getDate(),
      times: '',
      valid: '',
      customValid: '',
      colorData: {},
    };

    this.map = null;//地图
    this.gridLayer = null;//网格图层

    this.gridFeatures = [];//网格多边形feature
    this.districtLayer = null;//选区图层
    this.draw = null;//绘制标志
    this.selectedFeatures = [];//在绘制区域的格点

    this.currentGridData = [];//当前网格数据
    this.historyGridData = [];//历史网格数据
    this.revokeFlag = 0;

    this.testArr = [];
  }

  componentDidMount() {
    this.initMap();
  }

  initMap() {
    let cqLayer = new Layer.Vector({
      source: new Source.Vector({
        projection: 'EPSG:4326',
        url: cqGeojson,
        format: new FormatGeoJson(),
      }), //矢量数据源
      style: provinceStyle, //样式设置
    });
    let riverLayer = new Layer.Vector({
      source: new Source.Vector({
        url: river,
        format: new FormatGeoJson(),
      }),
      style: new OlStyles.Style({
        stroke: new OlStyles.Stroke({ //边界样式
          color: 'blue',
          width: 1,
        }),
      }),
      name: '重庆展示河流',
    });

    this.map = new Map({
      target: 'map',
      view: new View({
        center: Proj.transform([107.78687, 30.13550], 'EPSG:4326', 'EPSG:3857'), // 地图初始中心点,
        zoom: 8,
        minZoom: 7,
        maxZoom: 12,
        enableRotation: false,
      }),
      layers: [cqLayer, riverLayer],
    });
    this.map.getView().on('change:resolution', this.checkZoom.bind(this));//checkZoom为调用的函数
  }

  checkZoom() {
    let zoom = Math.ceil(this.map.getView().getZoom());
    // if (zoom === 8) {
    //   this.setGridFeatureStyle( 8);
    // }
    // else if (zoom === 10) {
    //   this.setGridFeatureStyle( 4);
    // }
    // else if (zoom === 12) {
    //   this.setGridFeatureStyle( 2);
    // }
    // else if (zoom === 14) {
    //   this.setGridFeatureStyle( 1);
    // }
  }

  //选择时间
  onChangeDate(date, dateString) {
    let time = dateString;
    if (dateString === '') time = utils.getDate();
    this.setState({
      date: time,
    });
  }

  //选择时次
  selectTimes(data) {
    this.setState({
      times: data,
    });
  }

  //选择时效
  selectValid(data) {
    this.setState({
      valid: data,
    });
  }

  //自定义时效
  customValid(data) {
    this.setState({
      customValid: data,
    });
  }

  //加载网格
  loadOrigin(step = 0.025) {
    if (!this.gridLayer) {
      this.addGridLayer(0.025, 4);
    }
    else {
      this.map.removeLayer(this.gridLayer);
      this.gridLayer = null;
    }
  }

  //添加网格图层
  addGridLayer(step = 0.025, multiple = 1) {
    this.gridLayer = new Layer.Vector({ source: null, style: null, name: 'gridLayer' });
    this.map.addLayer(this.gridLayer);

    let gridDataObj = this.props.home.gridData;
    let gridFeatures = [];//点的feature
    let startLon = gridDataObj.startLon;	//开始经度
    let startLat = gridDataObj.startLat;	//开始纬度
    let endLon = gridDataObj.endLon;	//结束纬度
    let endLat = gridDataObj.endLat;	//结束纬度
    let lon;		//实际经度
    let lat;		//实际维度

    let ind = -1;
    for (let i = 0; i < Math.ceil((endLat - startLat) / (step * multiple)); i++) {
      lat = startLat + i * step * multiple;
      this.currentGridData.push([]);
      for (let j = 0; j <= Math.ceil((endLon - startLon) / (step * multiple)); j++) {
        ind++;
        lon = startLon + j * step * multiple;
        this.currentGridData[i].push(0);

        let coordinates = [
          [lon, lat],
          [lon + step * multiple, lat],
          [lon + step * multiple, lat - step * multiple],
          [lon, lat - step * multiple],
          [lon, lat],
        ];
        gridFeatures[ind] = this.setGridFeature(coordinates, i, j, this.currentGridData);
      }
    }
    this.gridFeatures = gridFeatures;
    const source = new Source.Vector({ features: gridFeatures });
    this.gridLayer.setSource(source);
    this.setGridFeatureStyle(1, this.currentGridData);
  }

  //每个多边形的feature
  setGridFeature(coordinates, row, column, data) {
    let coordinatePolygon = [];
    for (let i = 0; i < coordinates.length; i++) {
      let pointTransform = Proj.transform([coordinates[i][0], coordinates[i][1]], 'EPSG:4326', 'EPSG:3857');
      coordinatePolygon.push(pointTransform);
    }
    return new Feature({
      type: 'Polygon',
      geometry: new Geom.Polygon([coordinatePolygon]),
      title: '地质灾害',
      value: data[row][column],
      row: row,
      column: column,
    });
  }

  //设置网格样式以及数目
  setGridFeatureStyle(num = 2, data) {
    let Features = this.gridFeatures;
    // this.map.removeLayer(this.districtLayer);
    for (let i = 0; i < Features.length; i++) {
      let row = Features[i].get('row');
      let column = Features[i].get('column');
      Features[i].setStyle(null);
      Features[i].setProperties({
        value: data[row][column] + '',
      });
      // if (row % num === 0 && column % num === 0) {
      Features[i].setStyle(function() {
        return new OlStyles.Style({
          stroke: new OlStyles.Stroke({ color: 'rgb(166, 166, 166)', width: 1 }),
          fill: new OlStyles.Fill({ color: utils.getColor(data[row][column]) }),
          text: new OlStyles.Text({
            text: '' + Features[i].get('value'),
          }),
        });
      });
      // }
    }
  }

  //多维数组深拷贝
  deepCopy(obj) {
    let out = [];
    for (let i = 0; i < obj.length; i++) {
      if (obj[i] instanceof Array) {
        out[i] = this.deepCopy(obj[i]);
      }
      else out[i] = obj[i];
    }
    return out;
  }

  //选择工具
  selectTool(data) {
    console.log('data--->', data);
    switch (data.id) {
      case 1://拖动地图
        this.map.removeInteraction(this.draw);
        break;
      case 2://选择区域
        this.district();
        break;
      case 3://撤销
        this.revoke();
        break;
      case 4://出图
        this.exportMapImg();
        break;
    }
  }

  //图片导出
  exportMapImg() {
    this.map.once('rendercomplete', function(event) {
      var canvas = event.context.canvas;
      if (navigator.msSaveBlob) {
        navigator.msSaveBlob(canvas.msToBlob(), 'map.png');
      } else {
        canvas.toBlob(function(blob) {
          saveAs(blob, 'map.png');
        });
      }
    });
    this.map.renderSync();
  }

  //撤销
  revoke() {
    if (this.historyGridData.length === 0) {
      return message.warning('当前没有数据存储版本！');
    } else {
      this.currentGridData = this.historyGridData.pop();
      this.setGridFeatureStyle(2, this.currentGridData);
    }
  }

  //绘制区域
  district() {
    if (!this.gridLayer) return message.warning('请先加载初始场！');
    let source = new Source.Vector(); //图层数据源
    if (!this.districtLayer) {
      this.draw = new Interaction.Draw({
        type: 'Polygon',
        freehand: true,
        source: source,
      });
      this.map.addInteraction(this.draw);

      this.districtLayer = new Layer.Vector({
        zIndex: 30,
        source: source,
        style: new OlStyles.Style({ //图层样式
          stroke: new OlStyles.Stroke({
            color: 'rgba(61, 133, 198,0.8)',
            width: 1,   // 边框宽度
          }),
        }),
      });
      this.map.addLayer(this.districtLayer); //添加图层

      //绘制完成时
      this.draw.on('drawend', (evt) => {
        let polygon = evt.feature.getGeometry();
        setTimeout(() => {
          let coords = polygon.getCoordinates()[0];
          let extent = polygon.getExtent();
          // let features = this.gridLayer.getSource().getFeaturesInExtent(extent);
          this.gridLayer.getSource().forEachFeatureIntersectingExtent(extent, feature => {
            //获取在所选区域中每个方格的中心点
            let centerPoint = Extent.getCenter(feature.getGeometry().getExtent());
            //判断格子的中心点是否在所选择的区域，并把feature保存起来
            if (utils.insidePolygon(coords, centerPoint)) {
              this.selectedFeatures.push(feature);
            }
          });
        }, 300);
      });
    }
    else {
      this.map.removeLayer(this.districtLayer);
      this.map.removeInteraction(this.draw);
      this.districtLayer = null;
      this.draw = null;
    }
  }

  //选择色卡
  selectToolTip(data) {
    if (this.selectedFeatures.length === 0) return message.warning('请先选择区域！');
    this.changeFeature(this.selectedFeatures, data);
  }

  //改变所选区域颜色
  changeFeature(selectedFeatures, data) {
    if (selectedFeatures.length !== 0) {
      //移除绘制区域的feature
      let districtFeature = this.districtLayer.getSource().getFeatures();
      districtFeature.forEach((feature, i) => {
        this.districtLayer.getSource().removeFeature(feature);
      });

      //把未修改前的网格数据保存在history里
      this.historyGridData.push(this.deepCopy(this.currentGridData));
      for (let i = 0; i < selectedFeatures.length; i++) {
        let row = selectedFeatures[i].get('row');
        let column = selectedFeatures[i].get('column');
        //改变数值
        this.currentGridData[row][column] = data.code;
        //设置feature的value值
        selectedFeatures[i].setProperties({
          value: data.code + '',
        });
        selectedFeatures[i].setStyle(new OlStyles.Style({
          stroke: new OlStyles.Stroke({ color: 'rgb(166, 166, 166)', width: 1 }),
          fill: new OlStyles.Fill({ color: data.rgba }),
          text: new OlStyles.Text({
            textAlign: 'center',
            text: selectedFeatures[i].get('value'),
            font: '16px',
          }),
        }));
      }
      this.selectedFeatures = [];
      this.revokeFlag++;
    }
  }


  render() {
    return (
      <div className={styles.container}>

        <div className={styles.content}>
          <div id={'map'} className={styles.map}/>
        </div>

        {/*左边部分*/}
        {/*<div className={styles.left}>*/}


        {/*选择条件*/}
        <div className={styles.optionBox}>
          {/*失效选择*/}
          <div className={styles.dateBox}>
            <span>预报时间：</span>
            <LocaleProvider locale={zh_CN}>
              <DatePicker
                locale={'zh_CN'}
                defaultValue={moment(this.state.date)}
                onChange={(date, dateString) => this.onChangeDate(date, dateString)}
              />
            </LocaleProvider>
          </div>
          {/*预报时次选择*/}
          <OptionFilter options={['02', '08', '14', '20']} title={'预报时次'} selectOption={(data) => {
            this.selectTimes(data);
          }}/>
          {/*预报时效选择*/}
          <OptionFilter options={['12', '24', '36', '48', '60', '72', '84', '96']} title={'预报时效'}
                        selectOption={(data) => {
                          this.selectValid(data);
                        }}
                        customValid={(data) => {
                          this.customValid(data);
                        }}
                        hasInput={true}
          />

          <div className={styles.originBox}>
            <div className={styles.confirmValid} onClick={() => {
              this.loadOrigin();
            }}>加载初始场
            </div>
          </div>

        </div>

        {/*工具箱*/}
        <Toolbox toolList={this.props.home.toolList} title={'工具箱'} selectTool={(data) => {
          this.selectTool(data);
        }}/>

        {/*色卡*/}
        <ColorBar toolTipList={this.props.home.toolTipList} selectToolTip={(data) => {
          this.selectToolTip(data);
        }}/>

        {/*</div>*/}
        {/*内容部分*/}


      </div>
    );
  }
}

export default Home;
