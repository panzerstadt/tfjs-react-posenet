// main imports
import React, { Component } from "react";
import logo from "./logo.svg";

// styles
import "./App.css";
import styles from "./App.module.css";

// components
import PoseNet, { PoseNetReplay, PoseNetMatch } from "./components/Posenet";

// constants
import { COLORS } from "./lib/constants";

class App extends Component {
  state = {
    recording: [],
    videoRecording: [],
    replay: false,
    front: true,
    video: true,
    multipose: false,
    stop: false,
    mode: "record",
    dims: {},
    hideInfo: false
  };
  onToggle = this.onToggle.bind(this);
  onToggleFrontCamera = this.onToggleFrontCamera.bind(this);
  onToggleVideoFeed = this.onToggleVideoFeed.bind(this);
  onTracePose = this.onTracePose.bind(this);
  onTraceVideo = this.onTraceVideo.bind(this);
  onToggleMultiPose = this.onToggleMultiPose.bind(this);
  onStartRecord = this.onStartRecord.bind(this);
  onStopRecord = this.onStopRecord.bind(this);

  onToggle(e) {
    this.setState({ replay: !this.state.replay, mode: e });
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

  onTracePose(e) {
    this.setState({ recording: e });
  }

  onTraceVideo(e) {
    console.log("tracing video");
    this.setState({ videoRecording: e });
  }

  onStartRecord() {
    this.setState({ record: true });
  }

  onStopRecord() {
    this.setState({ record: false });
  }

  componentDidMount() {
    this.setState({ height: window.innerHeight, width: window.innerWidth });
    setTimeout(() => this.setState({ hideInfo: true }), 10000);
  }

  render() {
    const ModeButtons = () => (
      <div className={styles.modeButtons}>
        <div className={styles.btnContainer}>
          <button
            className={styles.btnLeft}
            onClick={() => this.onToggle("record")}
            style={{
              padding: "8px 15px",
              backgroundColor:
                this.state.recording.length === 0 ? COLORS.secondary : "white",
              color: this.state.recording.length === 0 ? "white" : "black"
            }}
          >
            RECORD 📹
          </button>
          <button
            className={styles.btn}
            onClick={() => this.onToggle("replay")}
            style={{
              padding: "8px 15px",
              backgroundColor:
                this.state.recording.length !== 0 ? COLORS.main : "white",
              color: this.state.recording.length !== 0 ? "white" : "black"
            }}
          >
            REPLAY ▶️
          </button>
          <button
            className={styles.btnRight}
            onClick={() => this.onToggle("compete")}
            style={{
              padding: "8px 15px",
              backgroundColor:
                this.state.recording.length !== 0 ? COLORS.main : "white",
              color: this.state.recording.length !== 0 ? "white" : "black"
            }}
          >
            COMPETE ⚔️
          </button>
        </div>
      </div>
    );

    const MainContent = (
      <>
        <div
          style={{ display: this.state.mode === "replay" ? "block" : "none" }}
        >
          <PoseNetReplay
            poseRecords={this.state.recording}
            poseVideo={this.state.videoRecording}
            showVideo={true}
          />
        </div>
        {this.state.mode === "record" ? (
          <PoseNet
            videoWidth={600}
            //videoHeight={500}
            mobileNetArchitecture={1.01}
            outputStride={8}
            loadingText={"Loading..."}
            frontCamera={this.state.front}
            getPoseRecords={this.onTracePose}
            getVideoRecords={this.onTraceVideo}
            showVideo={this.state.video}
            algorithm={this.state.multipose ? "multi-pose" : "single-pose"}
            record={this.state.record}
            recordVideo
          />
        ) : (
          ""
        )}
        {this.state.mode === "compete" ? (
          <PoseNetMatch
            poseRecords={this.state.recording}
            poseVideo={this.state.videoRecording}
          />
        ) : (
          ""
        )}
      </>
    );

    const RecordToggles = (
      <div
        className={styles.toggles}
        style={{
          display: "flex",
          justifyContent: "space-evenly"
        }}
      >
        <button
          className={styles.toggleButton}
          onClick={this.onToggleFrontCamera}
        >
          {this.state.front ? "front" : "rear"} camera
        </button>
        <button
          className={styles.toggleButton}
          onClick={this.onToggleVideoFeed}
        >
          video {this.state.video ? "on" : "off"}
        </button>
        <button
          className={styles.toggleButton}
          onClick={this.onToggleMultiPose}
        >
          {this.state.multipose ? "multi-" : "single "}pose
        </button>
        <button className={styles.toggleButton} onClick={this.onStartRecord}>
          start recording
        </button>
        <button
          className={styles.toggleButtonRight}
          onClick={this.onStopRecord}
        >
          stop recording
        </button>
      </div>
    );

    const InfoWarning = (
      <div
        style={{ display: this.state.hideInfo ? "none" : "initial" }}
        className={styles.warning}
      >
        <code
          style={{
            fontSize: 10,
            color: "grey"
          }}
        >
          * video toggle and single/multipose toggles don't seem to work while
          camera is already running. please toggle between cameras to make it
          work.
        </code>
      </div>
    );

    const isRecordingEmpty = this.state.recording.length === 0;

    return (
      <div className={styles.app}>
        <div>
          <div
            className={styles.frames}
            style={{ color: isRecordingEmpty ? "red" : "black" }}
          >
            <code>recorded frames: {this.state.recording.length}</code>
          </div>

          <div
            style={{
              display: this.state.mode === "record" ? "flex" : "none",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            {RecordToggles}
            {InfoWarning}
          </div>
        </div>

        {MainContent}
        <ModeButtons />
      </div>
    );
  }
}

export default App;
