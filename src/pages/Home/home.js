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
import { message, Modal, Button, Input } from 'antd';
import { saveAs } from 'file-saver';

import cqGeojson from '../../assets/mapData/chongqing.geojson';
import river from '../../assets/mapData/river.geojson';
import Toolbox from '@/components/Toolbox/Toolbox';
import ColorBar from '@/components/ColorBar/ColorBar';
import * as gridMapUtils from './gridMapUtils';


const mapLayerStyle = {
  cqProvinceStyle: (feature) => {
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
    });
  },
  riverLayerStyle: () => {
    return new OlStyles.Style({
      stroke: new OlStyles.Stroke({ //边界样式
        color: 'blue',
        width: 1,
      }),
    });
  },
};

const mapClass = {
  initMap: (container, layers, centerPoint) => {
    return new Map({
      target: container,
      view: new View({
        center: Proj.transform(centerPoint, 'EPSG:4326', 'EPSG:3857'), // 地图初始中心点,
        zoom: 8,
        minZoom: 7,
        maxZoom: 11,
        enableRotation: false,
        // zoomFactor: 1.9
      }),
      layers: [...layers],
    });
  },
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
      sequence: '02',
      valid: '12',
      customValid: '',
      colorData: {},
      visible: false,
      title: '重庆市地质灾害气象风险预警图',
      subtitle: '重庆市规划和自然资源局、重庆市气象局联合发布',

      // distance:
    };

    this.map = null;//地图
    this.gridLayer = null;//网格图层
    this.outerGridLayer = null;//外层网格图层
    this.outerGridFeatures = null;//外层网格图层
    this.gridFeatures = [];//网格多边形feature
    this.districtLayer = null;//选区图层
    this.draw = null;//绘制标志
    this.selectedFeatures = [];//选中的格点
    this.currentSelectedFeatures = [];//当前选中的格点

    this.currentGridData = [];//当前网格数据
    this.outerGridData = [];
    this.historyGridData = [];//历史网格数据

    this.multiple = 5;
    this.isShowLine = false;
    this.zoom = 8;

  }

  createGridData(gridDataObj, multiple) {
    let data = [];
    for (let i = 0; i < Math.ceil((gridDataObj.endLat - gridDataObj.startLat) / (0.025 * multiple)); i++) {
      data.push([]);
      for (let j = 0; j <= Math.ceil((gridDataObj.endLon - gridDataObj.startLon) / (0.025 * multiple)); j++) {
        data[i].push(0);
      }
    }
    return data;
  }

  componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);


    this.initMap();

    //生成当前网格数据
    this.currentGridData = gridMapUtils.createGridData(this.props.home.gridData, 1);
    //生成临时网格数据
    this.outerGridData = gridMapUtils.createGridData(this.props.home.gridData, this.multiple);

  }

  onKeyDown = (e) => {
    switch (e.keyCode) {
      case 32://回车事件
        console.log('onKeyDown');
        if (this.draw) this.map.removeInteraction(this.draw);
        break;
    }
  };
  onKeyUp = (e) => {
    switch (e.keyCode) {
      case 32://回车事件
        console.log('onKeyUp');
        this.map.addInteraction(this.draw);
        break;
    }
  };

  initMap() {
    let cqLayer = new Layer.Vector({
      source: new Source.Vector({
        projection: 'EPSG:4326',
        url: cqGeojson,
        format: new FormatGeoJson(),
      }), //矢量数据源
      style: mapLayerStyle.cqProvinceStyle, //样式设置
    });
    let riverLayer = new Layer.Vector({
      source: new Source.Vector({
        url: river,
        format: new FormatGeoJson(),
      }),
      style: mapLayerStyle.riverLayerStyle,
      name: '重庆展示河流',
    });

    this.map = gridMapUtils.initMap('map', [cqLayer, riverLayer], [107.78687, 30.13550], 8, 7, 11);

    this.map.getView().on('change:resolution', this.checkZoom.bind(this));//checkZoom为调用的函数
  }

  checkZoom() {
    let zoom = Math.ceil(this.map.getView().getZoom());
    // this.currentGridData = [];

    if (this.gridLayer) {
      switch (zoom) {
        case 7:
          this.multiple = 5;
          this.isShowLine = false;
          this.outerGridData = [];
          this.map.removeLayer(this.outerGridLayer);
          this.outerGridLayer = null;
          this.outerGridData = this.createGridData(this.props.home.gridData, this.multiple);
          this.outerGridLayer = this.createGridLayer(this.props.home.gridData, this.outerGridData, 0.025, this.multiple, this.isShowLine);
          this.map.addLayer(this.outerGridLayer);
          break;
        case 8:
          this.multiple = 4;
          this.isShowLine = false;
          this.outerGridData = [];
          this.map.removeLayer(this.outerGridLayer);
          this.outerGridLayer = null;
          this.outerGridData = this.createGridData(this.props.home.gridData, this.multiple);
          this.outerGridLayer = this.createGridLayer(this.props.home.gridData, this.outerGridData, 0.025, this.multiple, this.isShowLine);
          this.map.addLayer(this.outerGridLayer);
          break;
        case 9:
          this.map.removeLayer(this.outerGridLayer);
          this.outerGridLayer = null;
          this.multiple = 2;
          this.isShowLine = false;
          break;
        case 10:
        case 11:
          this.multiple = 1;
          this.isShowLine = true;
          break;
      }
      gridMapUtils.setGridFeatureStyle(this.gridLayer, this.currentGridData, this.multiple, this.isShowLine);
    }
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
      sequence: data,
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
      valid: data,
    });
  }

  //加载网格
  loadOrigin() {
    if (!this.gridLayer) {
      this.addGridLayer();
    } else {
      this.map.removeLayer(this.gridLayer);
      this.gridLayer = null;
    }
  }

  //添加网格图层
  addGridLayer() {

    //最原始网格图层
    this.gridLayer = gridMapUtils.createGridLayer(this.props.home.gridData, this.currentGridData, 0.025, 1);
    gridMapUtils.setGridFeatureStyle(this.gridLayer, this.currentGridData, 1, this.isShowLine);
    this.map.addLayer(this.gridLayer);

    //当层级较小时，生成一个临时图层展示；当层级较大时，remove掉这个临时图层
    this.outerGridLayer = gridMapUtils.createGridLayer(this.props.home.gridData, this.outerGridData, 0.025, 10);
    gridMapUtils.setGridFeatureStyle(this.outerGridLayer, this.outerGridData, 10, this.isShowLine);
    this.map.addLayer(this.outerGridLayer);
  }

  //创建网格图层gridLayer
  createGridLayer(gridDataObj, gridData, step, multiple, isShowLine, hasStyle) {
    const features = this.getGridFeatures(gridDataObj, gridData, step, multiple);
    // const features = gridMapUtils.createGridFeature(gridDataObj, gridData, step, multiple);
    const source = new Source.Vector({ features: features });
    let layer = new Layer.Vector({ source: source, style: null, name: 'gridLayer' });
    this.setGridFeatureStyle(layer, gridData, multiple, isShowLine, hasStyle);
    return layer;
  }


  //获取网格多边形feature数组
  getGridFeatures(gridDataObj, gridData, step, multiple) {
    let gridFeatures = [];//格点的feature
    let lon;		//实际经度
    let lat;		//实际维度

    let idx = -1;//每个格子的index
    for (let i = 0; i < Math.ceil((gridDataObj.endLat - gridDataObj.startLat) / (step * multiple)); i++) {
      lat = gridDataObj.startLat + i * step * multiple;
      // this.currentGridData.push([]);
      for (let j = 0; j <= Math.ceil((gridDataObj.endLon - gridDataObj.startLon) / (step * multiple)); j++) {
        idx++;
        lon = gridDataObj.startLon + j * step * multiple;
        // this.currentGridData[i].push(0);

        let coordinates = [
          [lon, lat],
          [lon + step * multiple, lat],
          [lon + step * multiple, lat - step * multiple],
          [lon, lat - step * multiple],
          [lon, lat],
        ];
        gridFeatures[idx] = this.setGridFeatureConfig(coordinates, i, j, gridData, idx);
      }
    }
    return gridFeatures;
  }

  //每个多边形的feature
  setGridFeatureConfig(coordinates, row, column, data, index) {
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
      idx: index,
    });
  }

  //设置网格样式
  setGridFeatureStyle(layer, data, multiple, isShowLine) {
    // let Features = this.gridFeatures;
    let Features = layer.getSource().getFeatures();
    for (let i = 0; i < Features.length; i++) {
      let row = Features[i].get('row');
      let column = Features[i].get('column');
      Features[i].setStyle(null);
      Features[i].setProperties({
        value: data[row][column] + '',
      });
      let flag = row % this.multiple === 0 && column % this.multiple === 0;
      // hasStyle ?
      Features[i].setStyle(function() {
        return new OlStyles.Style({
          stroke: isShowLine ? new OlStyles.Stroke({
            color: 'rgb(166, 166, 166)',
            width: 1,
          }) : null,
          fill: new OlStyles.Fill({ color: utils.getColor(data[row][column]) }),
          text: flag ? new OlStyles.Text({
            text: '' + Features[i].get('value'),
            textAlign: 'center',
          }) : null,
        });
      });
      // :
      // Features[i].setStyle(function() {
      //   return null;
      // });
    }
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
        this.showModal();
        // this.exportMapImg();
        break;
    }
  }

  showModal() {
    this.setState({
      visible: !this.state.visible,
    });
  }

  //图片导出
  exportMapImg() {
    let params = {};
    params.forecastDate = this.state.date;
    params.sequence = this.state.sequence;
    params.valid = this.state.valid;
    params.createTime = utils.getDateAndHour();
    params.title = this.state.title;
    params.subtitle = '（' + this.state.subtitle + '）';
    params.data = this.currentGridData;

    console.log('params-->', params);

    fetch('http://localhost:8889/cctz/metheo/DrawGrid2PicServlet.svt', {
      method: 'POST',
      headers: {
        // 'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      // body: JSON.stringify(params),
      body: params,
    }).then(function(response) {
      console.log('response-------->', response);
      alert('success');
    }).catch(error => {
      console.log('error------------>', error);
    });
    // this.map.once('rendercomplete', function(event) {
    //   var canvas = event.context.canvas;
    //   if (navigator.msSaveBlob) {
    //     navigator.msSaveBlob(canvas.msToBlob(), 'map.png');
    //   } else {
    //     canvas.toBlob(function(blob) {
    //       saveAs(blob, 'map.png');
    //     });

    //   }
    // });
    // this.map.renderSync();
  }

  //撤销
  revoke() {
    if (this.historyGridData.length === 0) {
      return message.warning('当前没有数据存储版本！');
    } else {
      this.currentGridData = this.historyGridData.pop();
      this.selectedFeatures = this.selectedFeatures.slice(0, this.selectedFeatures.length - 1);
      this.setGridFeatureStyle(this.gridLayer, this.currentGridData, this.multiple, this.isShowLine);
    }
  }

  //绘制区域
  district() {
    if (!this.gridLayer) return message.warning('请先加载初始场！');
    let source = new Source.Vector(); //图层数据源
    if (!this.districtLayer) {
      //添加绘制interaction
      this.draw = gridMapUtils.createDraw(source);
      this.map.addInteraction(this.draw);

      //添加选区图层
      this.districtLayer = gridMapUtils.createDistrictLayer(source);
      this.map.addLayer(this.districtLayer);

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
              this.currentSelectedFeatures.push(feature);
              this.selectedFeatures.push(feature);
            }
          });
        }, 300);
        console.log('this.currentSelectedFeatures', this.currentSelectedFeatures);
        console.log('this.selectedFeatures', this.selectedFeatures);

        //获取当前所选择区域的feature
        // this.currentSelectedFeatures = gridMapUtils.getSelectedFeature(polygon, this.gridLayer, 'current');
        //获取所有选择的feature
        // this.selectedFeatures = gridMapUtils.getSelectedFeature(polygon, this.gridLayer, 'selected');
      });
    } else {
      this.map.removeLayer(this.districtLayer);
      this.map.removeInteraction(this.draw);
      this.districtLayer = null;
      this.draw = null;
    }
  }

  //选择色卡
  selectToolTip(data) {
    if (this.currentSelectedFeatures.length === 0) return message.warning('请先选择区域！');
    this.changeFeature(this.currentSelectedFeatures, data);
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
      this.historyGridData.push(utils.deepCopy(this.currentGridData));
      for (let i = 0; i < selectedFeatures.length; i++) {
        let row = selectedFeatures[i].get('row');
        let column = selectedFeatures[i].get('column');
        let idx = selectedFeatures[i].get('idx');
        console.log('row---->', row);
        console.log('column---->', column);
        console.log('idx---->', idx);
        //改变数值
        this.currentGridData[row][column] = data.code;
        //设置feature的value值
        selectedFeatures[i].setProperties({
          value: data.code + '',
        });
        let flag = row % this.multiple === 0 && column % this.multiple === 0;
        selectedFeatures[i].setStyle(new OlStyles.Style({
          stroke: this.isShowLine ? new OlStyles.Stroke({ color: 'rgb(166, 166, 166)', width: 1 }) : null,
          fill: new OlStyles.Fill({ color: data.rgba }),
          text: flag ?
            new OlStyles.Text({
              textAlign: 'center',
              text: selectedFeatures[i].get('value'),
              font: '16px',
            })
            :
            null,
        }));
      }
      this.currentSelectedFeatures = [];
    }
  }


  render() {
    return (
      <div className={styles.container}>

        <div className={styles.content}>
          <div id={'map'} className={styles.map}/>
        </div>

        <Modal
          visible={this.state.visible}
          title="导出图片"
          // onOk={this.handleOk}
          onCancel={() => {
            this.setState({ visible: false });
          }}
          footer={[
            <Button key="back" onClick={() => {
              this.setState({ visible: false });
            }}>取消</Button>,
            <Button key="submit" type="primary" onClick={() => {
              this.setState({ visible: false }, () => {
                this.exportMapImg();
              });
            }}>
              导出
            </Button>,
          ]}
        >
          <div>
            <div>
              主标题：<Input defaultValue={this.state.title} value={this.state.title} allowClear onChange={(e) => {
              this.setState({
                title: e.target.value,
              });
            }}/>
            </div>
            <div>
              副标题：<Input defaultValue={this.state.subtitle} value={this.state.subtitle} allowClear onChange={(e) => {
              this.setState({
                subtitle: e.target.value,
              });
            }}/>
            </div>
          </div>
        </Modal>

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
