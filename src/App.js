// main imports
import React, { Component } from "react";
import logo from "./logo.svg";

// styles
import "./App.css";
import styles from "./App.module.css";

// components
import PoseNet, { PoseNetReplay } from "./components/Posenet";

// constants
import { COLORS } from "./lib/constants";

const MAX_WIDTH = 400;

class App extends Component {
  state = {
    recording: [],
    videoRecording: [],
    replay: false,
    front: true,
    video: true,
    multipose: true,
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
    //console.log("tracing video");
    this.setState({ videoRecording: e });
  }

  onStartRecord() {
    this.setState({ record: true });
  }

  onStopRecord() {
    this.setState({ record: false });
  }

  componentDidMount() {
    this.setState({
      height: window.innerHeight,
      width: Math.min(window.innerWidth, MAX_WIDTH)
    });
    setTimeout(() => this.setState({ hideInfo: true }), 20000);
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
          className={styles.contentDiv}
          style={{ display: this.state.mode === "replay" ? "block" : "none" }}
        >
          <PoseNetReplay
            videoWidth={this.state.width}
            videoHeight={this.state.height}
            poseRecords={this.state.recording}
            poseVideo={this.state.videoRecording}
            showVideo={true}
            additionalOptions={true}
          />
        </div>
        {this.state.mode === "record" ? (
          <PoseNet
            videoWidth={this.state.width}
            videoHeight={this.state.height}
            mobileNetArchitecture={0.5}
            outputStride={8}
            imageScaleFactor={0.5}
            minPartConfidence={0.3}
            loadingText={"Loading..."}
            frontCamera={this.state.front}
            getPoseRecords={this.onTracePose}
            getVideoRecords={this.onTraceVideo}
            showVideo={this.state.video}
            algorithm={this.state.multipose ? "multi-pose" : "single-pose"}
            record={this.state.record}
            recordVideo
            compete={false}
          />
        ) : (
          ""
        )}
        {this.state.mode === "compete" ? <p>compete</p> : ""}
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
        className={styles.warningDiv}
      >
        <div className={styles.warning}>
          <code
            style={{
              fontSize: 10,
              color: "grey"
            }}
          >
            {/* and single/multipose toggles */}* video on/off toggle doesn't
            seem to work while camera is already running. please toggle between
            cameras to make it work.
          </code>
        </div>
      </div>
    );

    const isRecordingEmpty = this.state.recording.length === 0;

    //return MainContent;

    return (
      <div className={styles.app}>
        <div className={styles.appContent}>
          <div
            className={styles.frames}
            style={{
              color: isRecordingEmpty ? "red" : COLORS.secondary,
              fontSize: 15
            }}
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
