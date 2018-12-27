// main imports
import React, { Component } from "react";
import logo from "./logo.svg";

// styles
import "./App.css";

// components
import PoseNet, { PoseNetReplay } from "./components/Posenet";

class App extends Component {
  state = {
    recording: [],
    replay: false,
    front: false,
    video: true,
    multipose: false,
    stop: false
  };
  onToggle = this.onToggle.bind(this);
  onToggleFrontCamera = this.onToggleFrontCamera.bind(this);
  onToggleVideoFeed = this.onToggleVideoFeed.bind(this);
  onTrace = this.onTrace.bind(this);
  onToggleMultiPose = this.onToggleMultiPose.bind(this);
  onStartRecord = this.onStartRecord.bind(this);
  onStopRecord = this.onStopRecord.bind(this);

  onToggle() {
    this.setState({ replay: !this.state.replay });
  }

  onToggleFrontCamera() {
    this.setState({ front: !this.state.front });
  }

  onToggleVideoFeed() {
    this.setState({ video: !this.state.video });
  }

  onToggleMultiPose() {
    this.setState({ multipose: !this.state.multipose });
  }

  onTrace(e) {
    this.setState({ recording: e });
  }

  onStartRecord() {
    this.setState({ record: true });
  }

  onStopRecord() {
    this.setState({ record: false });
  }

  render() {
    return (
      <div className="App">
        <div
          style={{
            minHeight: 200,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column"
          }}
        >
          <img src={logo} className="App-logo" alt="logo" />
          <br />
          <div
            style={{
              width: "80%",
              display: "flex",
              justifyContent: "space-evenly"
            }}
          >
            <button onClick={this.onToggle}>toggle replay</button>
            <code>recorded frames: {this.state.recording.length}</code>
          </div>
          <hr style={{ width: "100%" }} />
          <div
            style={{
              width: "80%",
              display: "flex",
              justifyContent: "space-evenly"
            }}
          >
            <button onClick={this.onToggleFrontCamera}>
              {this.state.front ? "front" : "rear"} camera
            </button>
            <button onClick={this.onToggleVideoFeed}>
              video {this.state.video ? "on" : "off"}
            </button>
            <button onClick={this.onToggleMultiPose}>
              {this.state.multipose ? "multi-" : "single "}pose
            </button>
            <button onClick={this.onStartRecord}>start recording</button>
            <button onClick={this.onStopRecord}>stop recording</button>
          </div>
          <br />
          <code
            style={{
              fontSize: 10,
              color: "grey",
              width: "70%"
            }}
          >
            *video toggle and single/multipose toggles don't seem to work while
            camera is already running. please toggle between cameras to make it
            work.
          </code>
        </div>

        {!this.state.replay ? (
          <PoseNetReplay poseRecords={this.state.recording} />
        ) : (
          <PoseNet
            videoWidth={600}
            videoHeight={500}
            mobileNetArchitecture={0.5}
            outputStride={16}
            loadingText={"Loading..."}
            frontCamera={this.state.front}
            getPoseRecords={this.onTrace}
            showVideo={this.state.video}
            algorithm={this.state.multipose ? "multi-pose" : "single-pose"}
            record={this.state.record}
          />
        )}
      </div>
    );
  }
}

export default App;
