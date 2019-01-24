import React, { Component } from "react";
import InputRange from "react-input-range";

// styles
import styles from "./index.module.css";
import "react-input-range/lib/css/index.css";
import "./index.css";

export default class SliderScrubber extends Component {
  state = {
    value: {
      min: 10,
      max: 50
    }
  };
  onChangeComplete = this.onChangeComplete.bind(this);
  onChange = this.onChange.bind(this);

  onChangeComplete(v) {
    if (this.props.onChangeComplete) {
      this.props.onChangeComplete(v);
    }
  }

  onChange(v) {
    this.setState({ value: v });

    if (this.props.onChange) {
      this.props.onChange(v);
    }
  }

  render() {
    const { range } = this.props;

    const min = range ? range.min || 0 : 0;
    const max = range ? range.max || range || 100 : 100;
    const clampedValue = {
      min: Math.min(Math.max(this.state.value.min, min), max - 20),
      max: Math.min(this.state.value.max, max)
    };

    return (
      <div className={styles.sliderScrubber}>
        <InputRange
          draggableTrack
          maxValue={max}
          minValue={min}
          onChange={this.onChange}
          onChangeComplete={this.onChangeComplete}
          value={clampedValue}
        />
      </div>
    );
  }
}
