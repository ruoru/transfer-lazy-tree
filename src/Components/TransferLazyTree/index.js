import "./index.css";
import React, { Component } from "react";
import PropTypes from "prop-types";
import LazyTree from "../LazyTree";
import Button from "@huawei/eview-react/Button";

class TransferLazyTree extends Component {
  constructor(props) {
    super(props);

    this.state = {
      values: [],
      leftTreeSelectValues: [],
      rightTreeSelectValues: [],
      leftSearchText: "",
      rightSearchText: "",
      leftTreeExpandKeys: [],
      rightTreeExpandKeys: [],

      leftTreeTerminalValues: new Set(),
      rightTreeTerminalValues: new Set()
    };

    this.cache = {
      flatTreeNodesDictionary: {}
    };
  }

  componentDidMount() {
    this.updateStateForProps();
  }

  componentWillReceiveProps(nextProps) {
    this.updateStateForProps(nextProps);
  }

  componentWillUnmount() {
    this.setState({});
    this.cache = {};
  }

  updateStateForProps = (props = this.props) => {
    const { treeData, value, dataKeys } = props;
    let { flatTreeNodesDictionary } = this.cache;
    const rightTreeTerminalValues = new Set(value);
    const leftTreeTerminalValues = new Set();

    const result = this.patFlatTreeDataAndMergeOldAndTerminalVaues(
      treeData,
      dataKeys,
      flatTreeNodesDictionary
    );
    // separation terminal nodes
    for (let item of result.terminalValues) {
      if (!rightTreeTerminalValues.has(item)) {
        leftTreeTerminalValues.add(item);
      }
    }
    this.cache.flatTreeNodesDictionary = result.flatTreeNodesDictionary;

    const newState = Object.assign(new Object(), this.state, props, {
      rightTreeTerminalValues,
      leftTreeTerminalValues
    });
    this.setState(newState);
  };

  getNodesByValues = (values = new Set(), flatTreeNodesDictionary = {}) => {
    let nodes = [];
    for (let item of values) {
      nodes.push(flatTreeNodesDictionary[item]);
    }
    return nodes;
  };

  // In order to reduce the calculation of subsequent merges, so this design not a pure function
  patFlatTreeDataAndMergeOldAndTerminalVaues = (
    treeData,
    dataKeys,
    flatTreeNodesDictionary
  ) => {
    const copyTreeData = JSON.parse(JSON.stringify(treeData));
    const terminalValues = new Set();

    function loopData(treeData, dataKeys, path = []) {
      treeData.forEach(item => {
        const selfPath = JSON.parse(JSON.stringify(path));
        const itemValue = item[dataKeys.value];
        const itemChildren = item[dataKeys.children];
        selfPath.push(itemValue);

        if (item[dataKeys.hasChildren]) {
          loopData(itemChildren, dataKeys, selfPath);

          // get terminal values
          if (!Array.isArray(itemChildren) || itemChildren.length === 0) {
            terminalValues.add(itemValue);
          }

          item.path = selfPath;
          item.hasChildren = true;
          item.children = [];
        } else {
          item.path = selfPath;
          item.hasChildren = false;
          // get terminal values
          terminalValues.add(itemValue);
        }

        // not pure function cache, insert all node to cache
        //# if props tree change, so recover old data
        flatTreeNodesDictionary[itemValue] = item;
      });
    }

    loopData(copyTreeData, dataKeys);
    return { terminalValues, flatTreeNodesDictionary };
  };

  restoreFlatTreeData = (nodesValue = new Set(), flatTree = {}) => {
    const copyFlatTree = JSON.parse(JSON.stringify(flatTree));
    const terminalNodes = this.getNodesByValues(nodesValue, copyFlatTree);
    let emptyObjTree = {};

    terminalNodes.forEach(item => {
      loopRecoveryPath(item.path);
    });

    function loopRecoveryPath(valuesPath) {
      const value = valuesPath.shift();
      if (!emptyObjTree[value]) {
        emptyObjTree[value] = copyFlatTree[value];
        emptyObjTree[value].childrenObj = {};
      }
      if (emptyObjTree[value].hasChildren) {
        loopRecoverySubPath(valuesPath, emptyObjTree[value].childrenObj);
      }
    }

    function loopRecoverySubPath(valuesPath, node) {
      const index = valuesPath.shift();
      if (!node[index]) {
        node[index] = copyFlatTree[index];
        node[index].childrenObj = {};
      }
      if (node[index].hasChildren) {
        loopRecoverySubPath(valuesPath, node[index].childrenObj);
      }
    }

    function restoreChildrenArray(treeObjData, formatData = []) {
      for (let key in treeObjData) {
        let item = treeObjData[key];
        formatData.push(item);
        if (item.hasChildren) {
          item.children = restoreChildrenArray(item.childrenObj);
        }
      }
      return formatData;
    }

    const emptyTree = restoreChildrenArray(emptyObjTree);
    return emptyTree;
  };

  filterRestoreFlatData = (searchText, cacheAllFlatDataValues) => {
    const { dataKeys } = this.props;
    const { flatTreeNodesDictionary } = this.cache;

    let newTerminalValues = new Set([...cacheAllFlatDataValues]);

    if (searchText) {
      this.getNodesByValues(newTerminalValues, flatTreeNodesDictionary).forEach(
        item => {
          const value = `${item[dataKeys.value]}`,
            text = item[dataKeys.text];
          if (value.indexOf(searchText) < 0 && text.indexOf(searchText) < 0) {
            newTerminalValues.delete(value);
          }
        }
      );
    }

    const newData = this.restoreFlatTreeData(
      newTerminalValues,
      flatTreeNodesDictionary
    );

    return { newTerminalValues, newData };
  };

  onMoveToRight = () => {
    const { onMoveToRight, leftSelectedValues, dataKeys } = this.props;
    const { rightTreeTerminalValues } = this.state;
    const { flatTreeNodesDictionary, allRightFlatTreeDataValues } = this.cache;

    // left tree 先不做处理 左数过滤 思路删除 的 key 对应 node

    leftSelectedValues.forEach(item => {
      if (!flatTreeNodesDictionary[item].hasChildren) {
        allRightFlatTreeDataValues.add(item);
        rightTreeTerminalValues.add(item);
      }
    });

    this.cache.allRightFlatTreeDataValues = allRightFlatTreeDataValues;
    const newData = this.restoreFlatTreeData(
      rightTreeTerminalValues,
      flatTreeNodesDictionary
    );

    if (typeof onMoveToRight === "function") {
      //? think about right search text is in searhing data
      onMoveToRight(
        [...rightTreeTerminalValues],
        newData,
        allRightFlatTreeDataValues
      );
    }
  };

  onMoveToLeft = () => {
    const {
      rightSelectedValues,
      onMoveToLeft,
      rightSearchText,
      dataKeys
    } = this.props;
    const { rightTreeTerminalValues } = this.state;
    const { flatTreeNodesDictionary, allRightFlatTreeDataValues } = this.cache;

    let newTerminalValues = new Set([...rightTreeTerminalValues]);

    rightSelectedValues.forEach(item => {
      newTerminalValues.delete(item);
      allRightFlatTreeDataValues.delete(item);
    });
    this.cache.allRightFlatTreeDataValues = allRightFlatTreeDataValues;

    //? think about right search text is in searhing data
    const newData = this.restoreFlatTreeData(
      newTerminalValues,
      flatTreeNodesDictionary
    );
    if (typeof onMoveToLeft === "function") {
      onMoveToLeft([...newTerminalValues], newData, allRightFlatTreeDataValues);
    }
  };

  onLeftDataSelect = (values, node) => {
    const { onLeftDataSelect } = this.props;
    if (typeof onLeftDataSelect === "function") {
      onLeftDataSelect(values);
    }
  };

  onRightDataSelect = (values, node) => {
    const { onRightDataSelect } = this.props;
    if (typeof onRightDataSelect === "function") {
      onRightDataSelect(values);
    }
  };

  onLeftSearch = value => {
    const { onLeftSearch } = this.props;
    if (typeof onLeftSearch === "function") {
      onLeftSearch(value);
    }
  };

  onRightSearch = value => {
    const { onRightSearch, dataKeys } = this.props;
    const { rightFlatData } = this.state;
    const { allRightFlatTreeDataValues } = this.cache;
    //has search value need filter
    const { newTerminalValues, newData } = this.filterRestoreFlatData(
      value,
      allRightFlatTreeDataValues
    );
    if (typeof onRightSearch === "function") {
      onRightSearch(value, newData, newTerminalValues);
    }
  };

  render() {
    const {
      rightTreeExpandKeys,
      leftData,
      leftSelectedValues,
      leftSearchText,
      rightData,
      rightSelectedValues,
      rightSearchText,
      title,
      onLeftSearchChange
    } = this.props;
    const { leftTreeTerminalValues, rightTreeTerminalValues } = this.state;
    const { flatTreeNodesDictionary } = this.cache;

    const leftTree = this.restoreFlatTreeData(
      leftTreeTerminalValues,
      flatTreeNodesDictionary
    );
    const rightTree = this.restoreFlatTreeData(
      rightTreeTerminalValues,
      flatTreeNodesDictionary
    );

    return (
      <div className="transfer-lazy-tree">
        <div className="left-wrapper">
          <div className="left-title">
            {title.leftTitle ? <h3>{title.leftTitle}</h3> : ""}
          </div>
          <LazyTree
            data={leftTree}
            dataKeys
            checkedKeys={leftSelectedValues}
            searchText={leftSearchText}
            onSelect={this.onLeftDataSelect}
            onExpand={(values, node) => {
              const { onLeftExpand } = this.props;
              if (typeof onLeftExpand === "function") {
                onLeftExpand(node);
              }
            }}
            onSearchTextChange={value => {
              if (typeof onLeftSearchChange === "function") {
                onLeftSearchChange(value);
              }
            }}
            onSearch={this.onLeftSearch}
          />
        </div>
        <div className="center-wrapper">
          <Button text=">>" onClick={this.onMoveToRight} />
          <Button text="<<" tipShow="overflow" onClick={this.onMoveToLeft} />
        </div>
        <div className="right-wrapper">
          <div className="right-title">
            {title.rightTitle ? <h3>{title.rightTitle}</h3> : ""}
          </div>
          <LazyTree
            data={rightTree}
            dataKeys
            checkedKeys={rightSelectedValues}
            searchText={rightSearchText}
            onSelect={this.onRightDataSelect}
            onSearchTextChange={this.onRightSearch}
            onSearch={this.onRightSearch}
          />
        </div>
      </div>
    );
  }
}

TransferLazyTree.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
  title: PropTypes.object,

  treeData: PropTypes.array.isRequired,
  dataKeys: PropTypes.object,
  valueType: PropTypes.oneOf(["tree", "nodes"]),
  defaultValues: PropTypes.array,
  values: PropTypes.array,

  onChange: PropTypes.func,

  leftTreeSelectValues: PropTypes.array,
  rightTreeSelectValues: PropTypes.array,
  onLeftTreeSelect: PropTypes.func,
  onRightTreeSelect: PropTypes.func,

  showSearch: PropTypes.bool,
  leftSearchText: PropTypes.string,
  rightSearchText: PropTypes.string,
  onLeftSearchTextChange: PropTypes.func,
  onRightSearchTextChange: PropTypes.func,
  onLeftSearch: PropTypes.func,
  onRightSearch: PropTypes.func,

  defaultLeftTreeExpandKeys: PropTypes.array,
  defaultRightTreeExpandKeys: PropTypes.array,
  leftTreeExpandKeys: PropTypes.array,
  rightTreeExpandKeys: PropTypes.array,
  onLeftExpand: PropTypes.func,
  onRightExpand: PropTypes.func
};

TransferLazyTree.defaultProps = {
  treeData: [],
  valueType: "nodes",
  dataKeys: {
    text: "text",
    value: "value",
    children: "children",
    hasChildren: "hasChild"
  },
  title: {
    leftTitle: "",
    rightTitle: ""
  }
};

export default TransferLazyTree;
