/**
 * @Author:hgq
 * @Describe: 要素过滤
 */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import themeStyle from '../../styles/themeStyle.css';
import styles from './OptionFilter.css';

class OptionFilter extends Component {

  //属性..
  static propTypes = {
    options: PropTypes.array.isRequired,       //条件数据
    title: PropTypes.string.isRequired,       //标题
    selectOption: PropTypes.func.isRequired,  //选择条件
  };

  // 构造
  constructor(props) {
    super(props);
    // 初始状态
    this.state = {
      currentBeforeIndex: 0,
    };
  }

  //主要要素点击
  selectBasicOption(value, index, callback) {
    this.setState({
      currentBeforeIndex: index,
    }, () => {
      callback(value);
    });
  }

  render() {
    let { currentBeforeIndex } = this.state;
    let { hasInput, options, title, selectOption, customValid } = this.props;
    let num = 3 * Math.ceil(options.length / 3) - options.length;
    let fillEmptyArr = new Array(num).fill('');
    //空数组补全
    if (num !== 0) options = options.concat(fillEmptyArr);
    return (
      <div className={styles.optionsContainer}>
        <div className={styles.titleBox}>
          <div className={styles.blockBg}/>
          <div className={styles.tTitle}>{title || '标题'}</div>
        </div>
        <div>
          <ul>
            {options.map((item, index) => {
              return (
                <li
                  key={index}
                  onClick={() => {
                    this.selectBasicOption(item, index, selectOption);
                  }}
                  className={`
                        ${styles.item}
                        ${themeStyle.DarkThemeDefault}
                        ${item === '' && styles.emptyItem}
                        ${currentBeforeIndex === index && themeStyle.DarkThemeActive}
                      `}
                >
                  <span>{item}</span>
                </li>
              );
            })}
          </ul>
          {
            hasInput &&
            <div className={styles.customValidBox}>
              <span>自定义时效：</span>
              <input type="text" className={styles.customInput} onChange={(e) => {
                customValid(e.target.value);
              }}/>
              {/*<div className={styles.confirmValid}>确定</div>*/}
            </div>
          }
        </div>
      </div>
    );
  }
}

export default OptionFilter;
