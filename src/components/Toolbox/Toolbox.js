/**
 * @Author:hgq
 * @Date: 2019/3/15
 * @Describe:   工具箱 ColorBar
 */
import React, { Component } from 'react';
import styles from './Toolbox.css';
import themeStyle from '../../styles/themeStyle.css';
import PropTypes from 'prop-types';

class Toolbox extends Component {

  //属性..
  static propTypes = {
    toolList: PropTypes.array.isRequired,       //工具数据
    title: PropTypes.string.isRequired,       //标题
    selectTool: PropTypes.func.isRequired,  //选择工具
  };

  // 构造
  constructor(props) {
    super(props);
    // 初始状态
    this.state = {
      currentToolIndex: -1,
    };
  }

  selectTool(data, index, callback) {
    // let currentToolIndex = this.state.currentToolIndex !== index ? index : -1;
    this.setState({
      currentToolIndex: index,
    }, () => {
      callback(data);
    });
  }

  render() {
    let { currentToolIndex } = this.state;
    let { title, toolList, selectTool } = this.props;
    return (
      <div className={styles.toolContainer}>
        <div className={styles.toolBox}>
          <div className={styles.titleBox}>
            <div className={styles.blockBg}/>
            <div className={styles.tTitle}>{title || '标题'}</div>
          </div>

          <div className={styles.toolList}>
            {toolList.map((item, index) => {
              return (
                <div key={item.id}
                     className={`${styles.toolItem} ${currentToolIndex === index && themeStyle.DarkThemeActive}`}
                     title={item.name}
                     onClick={() => {
                       this.selectTool(item, index, selectTool);
                     }}
                >
                  <img src={item.icon} alt={item.name} width={'25px'} height={'25px'}/>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
}

export default Toolbox;
