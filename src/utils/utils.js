/**
 * @Author:hgq
 * @Describe:
 */

/**
 * 字符串长度（汉字算两个字符，字母数字算一个）
 */
export function getByteLen(val) {
  let len = 0;
  for (let i = 0; i < val.length; i++) {
    let a = val.charAt(i);
    if (a.match(/[^\x00-\xff]/ig) != null) {
      len += 2;
    } else {
      len += 1;
    }
  }
  return len;
}


/**
 * 获取日期 年月日 2019-03-26,
 * timeStamp  时间戳  默认当前时间
 */
export function getDate(timeStamp = new Date().getTime()) {
  let date = new Date(timeStamp);
  let sDate = (date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate())
    .replace(/([\-\: ])(\d{1})(?!\d)/g, '$10$2');
  return sDate;
}

/**
 * 往后加几天,
 * date  日期   2019-03-28
 * days  几天  number
 */
export function addDay(date, days) {
  if (!isNaN(days)) {
    let addTimeStamp = days * 24 * 60 * 60 * 1000;
    let targetDate = new Date(new Date(date).getTime() + addTimeStamp);
    let sDate = (targetDate.getFullYear() + '-' + (targetDate.getMonth() + 1) + '-' + targetDate.getDate())
      .replace(/([\-\: ])(\d{1})(?!\d)/g, '$10$2');
    return sDate;
  }
}

/**
 *  生成纯数字数组  startNum 开始数字  endNum  结束数字  interval 数字间隔
 */
export function createNumArr(startNum, endNum, interval) {
  let arr = [];
  for (let i = startNum; i <= endNum; i++) {
    if (i % interval === 0 && i !== startNum) {
      arr.push(i);
    }
  }
  return arr;
}

/**
 *  数组去重 ，如果有 则删掉原数组中该元素，若没有，则添加该元素
 */
export function unique(arr, val) {
  let index = arr.indexOf(val);
  if (index > -1) {
    arr.splice(index, 1);
  } else {
    arr.push(val);
  }
  return arr;
}


/**
 *  判断一个点是否在多边形内部
 *  @param points 多边形坐标集合
 *  @param testPoint 测试点坐标
 *  返回true为真，false为假
 *  */
export function insidePolygon(points, testPoint) {
  let x = testPoint[0], y = testPoint[1];
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    let xi = points[i][0], yi = points[i][1];
    let xj = points[j][0], yj = points[j][1];

    let intersect = ((yi > y) != (yj > y))
      && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}


/**
 *  判断一个点是否在圆的内部
 *  @param point  测试点坐标
 *  @param circle 圆心坐标
 *  @param r 圆半径
 *  返回true为真，false为假
 *  */
export function pointInsideCircle(point, circle, r) {
  if (r === 0) return false;
  let dx = circle[0] - point[0];
  let dy = circle[1] - point[1];
  return dx * dx + dy * dy <= r * r;
}

/**
 *  拷贝1维或者多维数组
 *  */

export function deepCopy(obj) {
  let out = [];
  for (let i = 0; i < obj.length; i++) {
    if (obj[i] instanceof Array) {
      out[i] = deepCopy(obj[i]);
    }
    else out[i] = obj[i];
  }
  return out;
}

/**
 *  根据值来获取颜色
 *  */

export function getColor(value) {
  let color = 'rgba(255,255,255,0.5)';
  switch (value) {
    case 0:
      color = 'rgba(255,255,255,0.5)';
      break;
    case 1:
      color = 'rgba(255,0,0,0.5)';
      break;
    case 2:
      color = 'rgba(215,143,0,0.5)';
      break;
    case 3:
      color = 'rgba(255,255,0,0.5)';
      break;
    case 4:
      color = 'rgba(114,223,255,0.5)';
      break;
  }
  return color;
}



