import "./index.css";
import React, { Component } from "react";
import Tree from "@huawei/eview-react/Tree";
import SearchInput from "@huawei/eview-react/SearchInput";
import { setLocalLanguage } from "../../../i18n/index";

class LazyTree extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedKeys: [],
      expandedKeys: [],
      msg: ""
    };
  }

  componentDidMount() {}

  componentWillReceiveProps(nextProps) {}

  handleCheck = (checkedKeys, node) => {
    const { onSelect } = this.props;
    if (typeof onSelect == "function") {
      onSelect(checkedKeys, node);
    }
  };

  handleExpand = (expandedKeys, node) => {
    const { onExpand } = this.props;
    if (typeof onExpand == "function") {
      onExpand(expandedKeys, node);
    }
    this.setState({ expandedKeys });
  };

  onSearchTextChange = value => {
    const { onSearchTextChange } = this.props;
    if (typeof onSearchTextChange == "function") {
      onSearchTextChange(value);
    }
  };

  onSearch = value => {
    const { onSearch } = this.props;
    if (typeof onSearch == "function") {
      onSearch(value);
    }
  };

  render() {
    const { checkedKeys, data, searchText } = this.props;
    const { expandedKeys } = this.state;

    return (
      <div className="lazy-tree">
        <SearchInput
          className="lazy-tree-input"
          placeholder={
            setLocalLanguage().messages["nic.create.task.wizard.common.search"]
          }
          value={searchText}
          onChange={this.onSearchTextChange}
          onSearch={this.onSearch}
          inputStyle={{ width: "660px", marginTop: "-10px" }}
        />
        <Tree
          style={{ width: "100%", height: "calc(100% - 111px)" }}
          className=""
          nodeKey={"id"}
          data={data}
          checkable={true}
          enableCheckbox={true}
          checkedKeys={checkedKeys}
          expandedKeys={expandedKeys}
          onCheck={this.handleCheck}
          onExpand={this.handleExpand}
        />
      </div>
    );
  }
}

export default LazyTree;