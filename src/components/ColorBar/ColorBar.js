/**
 * @Author:hgq
 * @Date: 2019/3/15
 * @Describe:   工具箱 ColorBar
 */
import React, { Component } from 'react';
import styles from './ColorBar.css';
import PropTypes from 'prop-types';

class ColorBar extends Component {

  //属性..
  static propTypes = {
    toolTipList: PropTypes.array.isRequired,       //工具数据
    selectToolTip: PropTypes.func.isRequired,  //选择工具
  };

  // 构造
  constructor(props) {
    super(props);
    // 初始状态
    this.state = {
      currentToolIndex: -1,
    };
  }

  selectToolTip(data, index, callback) {
    // let currentToolIndex = this.state.currentToolIndex !== index ? index : -1;
    this.setState({
      currentToolIndex: index,
    }, () => {
      callback(data);
    });
  }

  getItem = (list, selectToolTip) => {
    console.log('list-------------->', list);
    return list.map((item, index) => {
      return (
        <div key={index} className={styles.item} onClick={() => {
          selectToolTip(item);
        }}>
          <div className={styles.itemBg} style={{ backgroundColor: item.color }}/>
          <span>{item.desc}</span>
        </div>
      );
    });
  };

  render() {
    let { toolTipList, selectToolTip } = this.props;
    return (
      <div className={styles.container}>
        {this.getItem(toolTipList, selectToolTip)}
      </div>
    );
  }
}

export default ColorBar;
