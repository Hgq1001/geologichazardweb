import * as utils from '@/utils/utils';
import Map from 'ol/Map';
import View from 'ol/View';
import * as Proj from 'ol/proj';
import * as Source from 'ol/source';
import * as Layer from 'ol/layer';
import Feature from 'ol/Feature';
import * as Geom from 'ol/geom';
import * as OlStyles from 'ol/style';
import * as Interaction from 'ol/interaction';
import * as Extent from 'ol/extent';

/**
 * @Author:hgq
 * @Describe: 网格逻辑
 * 1、当地图层级较小时，创建一个临时网格图层tempLayer，只用作展示，不做任何数据处理，当地图层级较大时，移除这个临时图层
 * 2、从始至终一直有一个网格图层gridLayer，用于数据的处理，gridLayer通过层级来控制style：边界线（Stroke）、文字（Text）、颜色（Fill）
 * 3、当选择区域并修改值后，找到所选区域的所有feature，通过feature.getProperties()方法获取到 行（row）、列（column）,
 *    通过feature.setProperties()把value修改，并根据row,column把currentGridData也作修改（currentGridData是一个二维数组，注意数据的引用问题）
 *    把currentGridData存入到historyGridData数组中，根据currentGridData修改gridLayer样式
 * 4、撤销：currentGridData = historyGridData.pop(),再更新gridLayer样式
 */


/**
 * 地图初始化
 * @param container 地图容器
 * @param layers [] 默认的图层
 * @param centerPoint [] 中心点
 * @param zoom  默认层级
 * @param minZoom 最小层级
 * @param maxZoom 最大层级
 * @returns {Map}
 */
export const initMap = (container, layers, centerPoint, zoom = 8, minZoom = 7, maxZoom = 11) => {
  return new Map({
    target: container,
    view: new View({
      center: Proj.transform(centerPoint, 'EPSG:4326', 'EPSG:3857'), // 地图初始中心点,
      zoom: zoom,
      minZoom: minZoom,
      maxZoom: maxZoom,
      enableRotation: false,
      // zoomFactor: 1.9
    }),
    layers: [...layers],
  });
};

/**
 * 生成格点数据,此数据用作与后台通信
 * @param gridDataObj   后台给的gridData对象
 * @param multiple  用于控制feature的数量  multiple=1---全部网格   multiple越大，feature越少
 * @returns {Array}
 */
export const createGridData = (gridDataObj, multiple = 1) => {
  let data = [];
  for (let i = 0; i < Math.ceil((gridDataObj.endLat - gridDataObj.startLat) / (0.025 * multiple)); i++) {
    data.push([]);
    for (let j = 0; j <= Math.ceil((gridDataObj.endLon - gridDataObj.startLon) / (0.025 * multiple)); j++) {
      data[i].push(0);
    }
  }
  return data;
};

/**
 * 生成网格图层
 * @param gridDataObj   后台给的gridData对象
 * @param gridData      图层格点数据，二维数组 [[],[]]
 * @param step          经纬度跨度 项目中为0.025
 * @param multiple      控制feature数量，
 * @returns {VectorLayer}
 */
export const createGridLayer = (gridDataObj, gridData, step, multiple) => {
  let features = createGridFeature(gridDataObj, gridData, step, multiple);
  let source = new Source.Vector({ features: features });
  let gridLayer = new Layer.Vector({ source: source, style: null, name: 'gridLayer' });
  return gridLayer;
};

/**
 *  生成网格图层的feature
 * @param gridDataObj 后台给的gridData对象
 * @param gridData    格点数据
 * @param step        经纬度跨度 项目中为0.025
 * @param multiple    控制feature数量，
 * @returns {Array}
 */
const createGridFeature = (gridDataObj, gridData, step, multiple) => {
  let gridFeatures = [];//格点的feature
  let lon;		//实际经度
  let lat;		//实际维度

  let idx = -1;//每个格子的index
  for (let i = 0; i < Math.ceil((gridDataObj.endLat - gridDataObj.startLat) / (step * multiple)); i++) {
    lat = gridDataObj.startLat + i * step * multiple;
    for (let j = 0; j <= Math.ceil((gridDataObj.endLon - gridDataObj.startLon) / (step * multiple)); j++) {
      idx++;
      lon = gridDataObj.startLon + j * step * multiple;
      let coordinates = [
        [lon, lat],
        [lon + step * multiple, lat],
        [lon + step * multiple, lat - step * multiple],
        [lon, lat - step * multiple],
        [lon, lat],
      ];
      gridFeatures[idx] = setGridFeatureConfig(coordinates, i, j, gridData, idx);
    }
  }
  return gridFeatures;
};

/**
 *  设置每个格点的属性
 * @param coordinates   多边形的坐标集
 * @param row           行号
 * @param column        列号
 * @param data          格点数据
 * @param index         格子的编号
 * @returns {Feature}
 */
const setGridFeatureConfig = (coordinates, row, column, data, index) => {
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
};

/**
 *  设置feature的样式
 * @param layer     图层
 * @param data      图层对应的格点数据
 * @param multiple  控制图层每行每列的样式
 * @param isShowLine  是否显示边界线
 */
export const setGridFeatureStyle = (layer, data, multiple, isShowLine) => {
  let Features = layer.getSource().getFeatures();
  for (let i = 0; i < Features.length; i++) {
    let row = Features[i].get('row');
    let column = Features[i].get('column');
    // Features[i].setStyle(null);
    Features[i].setProperties({
      value: data[row][column] + '',
    });
    let flag = row % multiple === 0 && column % multiple === 0;
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
  }
};

export const createDistrictLayer = (source) => {
  return new Layer.Vector({
    zIndex: 30,
    source: source,
    style: new OlStyles.Style({
      stroke: new OlStyles.Stroke({
        color: 'rgba(61, 133, 198,0.8)',
        width: 1,
      }),
    }),
  });
};

export const createDraw = (source) => {
  return new Interaction.Draw({
    type: 'Polygon',
    freehand: true,
    source: source,
  });
};


export const getSelectedFeature = (polygon, layer) => {
  let selectedFeatures = [];
  let feature;
  return setTimeout(() => {
    let coords = polygon.getCoordinates()[0];
    let extent = polygon.getExtent();
    layer.getSource().forEachFeatureIntersectingExtent(extent, feature => {
      //获取在所选区域中每个方格的中心点
      let centerPoint = Extent.getCenter(feature.getGeometry().getExtent());
      //判断格子的中心点是否在所选择的区域，并把feature保存起来
      if (utils.insidePolygon(coords, centerPoint)) {
        selectedFeatures.push(feature);
        return feature
      }
    });
  }, 300);
};
