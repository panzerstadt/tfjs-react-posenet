// ref: https://github.com/jscriptcoder/tfjs-posenet/blob/master/src/PoseNet/index.jsx

// main imports
import React, { Component } from "react";
import * as posenet from "@tensorflow-models/posenet";
import Webcam from "react-webcam";
import ReactJson from "react-json-tree";

// styles
import styles from "./index.module.css";
// google theme
import { googleTheme } from "./helpers/themes";
import { colourNameToHex, getColorOpacityRangeHex } from "./helpers/color";

// components
import { isMobile, drawKeypoints, drawSkeleton } from "./utils";

export default class PoseNetComponent extends Component {
  static defaultProps = {
    videoWidth: 600,
    videoHeight: 500,
    algorithm: "single-pose",
    mobileNetArchitecture: isMobile() ? 0.5 : 1.01,
    showVideo: true,
    showSkeleton: true,
    showPoints: true,
    minPoseConfidence: 0.1,
    minPartConfidence: 0.5,
    maxPoseDetections: 2,
    nmsRadius: 20.0,
    outputStride: 16,
    imageScaleFactor: 0.5,
    skeletonColor: "aqua",
    skeletonLineWidth: 2,
    loadingText: "Loading pose detector...",
    frontCamera: true,
    stop: false,
    record: false
  };

  state = {
    loading: true,
    error_messages: "",
    stream: null,
    trace: []
  };
  camera = undefined;

  async componentDidUpdate(prevProps, prevState) {
    if (prevProps !== this.props) {
      if (prevProps.frontCamera !== this.props.frontCamera) {
        // stop existing camera
        this.stopCamera();
        // setup and start
        this.camera = await this.setupCamera();
        this.startCamera();
        // detect pose
        this.detectPose();
      }
    }
  }

  errorMessages() {
    // pipe out error messages
    if (this.props.errorMessages) {
      this.props.errorMessages(this.state.error_messages);
    }
  }

  // the traced sequence
  getPoseRecords() {
    if (this.props.getPoseRecords) {
      this.props.getPoseRecords(this.state.trace);
    }
  }

  tracePose(poses) {
    if (this.props.record) {
      console.log("recording frame!");
      this.setState({ trace: [...this.state.trace, ...poses] });
    }
  }

  getCanvas = elem => {
    this.canvas = elem;
  };

  getVideo = elem => {
    this.video = elem;
  };

  stopCamera() {
    const cam = this.camera;
    if (cam) {
      const stream = cam.srcObject;
      const tracks = stream.getTracks();

      // stop all tracks
      tracks.map(t => t.stop());
      this.camera = undefined;
      this.setState({ loading: true, stop: true });
    }
  }

  startCamera() {
    const cam = this.camera;
    if (cam) {
      this.setState({ loading: false, stop: false });
    } else {
      this.stopCamera();
    }
  }

  async setupCamera() {
    // MDN: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const e1 =
        "Browser API navigator.mediaDevices.getUserMedia not available";
      this.setState({ error_messages: e1 });
      throw e1;
    }

    const { videoWidth, videoHeight } = this.props;
    const video = this.video;
    const mobile = isMobile();
    const frontCamera = this.props.frontCamera;

    video.width = videoWidth;
    video.height = videoHeight;

    // MDN: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: frontCamera ? "user" : { exact: "environment" },
        width: mobile ? void 0 : videoWidth,
        height: mobile ? void 0 : videoHeight
      }
    });

    video.srcObject = stream;

    return new Promise(resolve => {
      video.onloadedmetadata = () => {
        // Once the video metadata is ready, we can start streaming video
        video.play();
        resolve(video); // promise returns video
      };
    });
  }

  detectPose() {
    const { videoWidth, videoHeight } = this.props;
    const canvas = this.canvas;
    const ctx = canvas.getContext("2d");

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    this.poseDetectionFrame(ctx);
  }

  poseDetectionFrame(ctx) {
    const {
      algorithm,
      imageScaleFactor,
      forceFlipHorizontal,
      outputStride,
      minPoseConfidence,
      maxPoseDetections,
      minPartConfidence,
      nmsRadius,
      videoWidth,
      videoHeight,
      showVideo,
      showPoints,
      showSkeleton,
      skeletonColor,
      skeletonLineWidth,
      frontCamera,
      stop
    } = this.props;

    const net = this.net;
    const video = this.video;
    const flipped = forceFlipHorizontal
      ? forceFlipHorizontal
      : frontCamera
      ? true
      : false;

    const poseDetectionFrameInner = async () => {
      let poses = [];

      switch (algorithm) {
        case "single-pose":
          const pose = await net.estimateSinglePose(
            video,
            imageScaleFactor,
            flipped,
            outputStride
          );

          poses.push(pose);
          break;

        case "multi-pose":
          poses = await net.estimateMultiplePoses(
            video,
            imageScaleFactor,
            flipped,
            outputStride,
            maxPoseDetections,
            minPartConfidence,
            nmsRadius
          );

          break;
      }

      ctx.clearRect(0, 0, videoWidth, videoHeight);

      if (showVideo) {
        ctx.save();
        if (flipped) {
          // https://christianheilmann.com/2013/07/19/flipping-the-image-when-accessing-the-laptop-camera-with-getusermedia/
          ctx.scale(-1, 1);
          ctx.translate(-videoWidth, 0);
        }
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
        ctx.restore();
      }

      // For each pose (i.e. person) detected in an image, loop through the poses
      // and draw the resulting skeleton and keypoints if over certain confidence
      // scores
      poses.forEach(({ score, keypoints }) => {
        if (score >= minPoseConfidence) {
          if (showPoints) {
            drawKeypoints(keypoints, minPartConfidence, skeletonColor, ctx);
          }
          if (showSkeleton) {
            drawSkeleton(
              keypoints,
              minPartConfidence,
              skeletonColor,
              skeletonLineWidth,
              ctx
            );
          }
        }
      });

      if (stop || this.state.stop || !this.camera) {
        console.log("stopping function");
        // clear canvas
        ctx.clearRect(0, 0, videoWidth, videoHeight);
      } else {
        // trace
        console.log(poses);
        this.tracePose(poses);
        this.getPoseRecords();
        // call next recursion
        requestAnimationFrame(poseDetectionFrameInner);
      }
    };

    poseDetectionFrameInner();
  }

  async componentDidMount() {
    this.net = await posenet.load(this.props.mobileNetArchitecture);
    console.log("loaded mobilenet");
    console.log(this.net);

    try {
      this.camera = await this.setupCamera();
    } catch (e) {
      const e2 =
        "This browser does not support video capture, or this device does not have a camera";
      this.setState({ error_messages: e2 });
      throw e2;
    } finally {
      this.setState({ loading: false });
    }

    this.detectPose();
  }

  componentWillUnmount() {
    console.log("component will unmounts!");
    this.stopCamera();
    this.setState({ stop: true });
  }

  render() {
    const loading = this.state.loading ? (
      <div className={styles.loading}>
        <code>{this.props.loadingText}</code>
        <br />
        <code style={{ color: "red", fontSize: 12 }}>
          {this.state.error_messages}
        </code>
      </div>
    ) : (
      ""
    );

    this.errorMessages();

    return (
      <div className={styles.posenet}>
        {loading}
        <video playsInline ref={this.getVideo} />
        {/* <Webcam ref={this.getVideo} /> */}
        <canvas ref={this.getCanvas} />
      </div>
    );
  }
}

export class PoseNetReplay extends Component {
  static defaultProps = {
    videoWidth: 600,
    videoHeight: 500,
    algorithm: "single-pose",
    mobileNetArchitecture: isMobile() ? 0.5 : 1.01,
    showVideo: true,
    showSkeleton: true,
    showPoints: true,
    minPoseConfidence: 0.1,
    minPartConfidence: 0.5,
    maxPoseDetections: 2,
    nmsRadius: 20.0,
    outputStride: 16,
    imageScaleFactor: 0.5,
    skeletonColor: "aqua",
    skeletonLineWidth: 2,
    loadingText: "Loading pose detector...",
    frontCamera: true,
    stop: false,
    record: false
  };

  getCanvas = elem => {
    this.canvas = elem;
  };

  drawPose() {
    const { videoWidth, videoHeight } = this.props;
    const canvas = this.canvas;
    const ctx = canvas.getContext("2d");

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    this.poseDrawFrame(ctx);
  }

  poseDrawFrame(ctx) {
    const {
      minPoseConfidence,
      minPartConfidence,
      videoWidth,
      videoHeight,
      showPoints,
      showSkeleton,
      skeletonColor,
      skeletonLineWidth
    } = this.props;

    const { poseRecords } = this.props;

    const poseDetectionFrameInner = async () => {
      let poses = [];

      poses = poseRecords;

      const clrRange = poses.length;
      let clr = colourNameToHex(skeletonColor) || "#cccccc";

      const clrList = getColorOpacityRangeHex(clrRange, clr);

      console.log("color list");
      console.log(clrList);

      ctx.clearRect(0, 0, videoWidth, videoHeight);

      // For each pose (i.e. person) detected in an image, loop through the poses
      // and draw the resulting skeleton and keypoints if over certain confidence
      // scores
      poses.map(({ score, keypoints }, i) => {
        if (score >= minPoseConfidence) {
          if (showPoints) {
            drawKeypoints(keypoints, minPartConfidence, clrList[i], ctx);
          }
          if (showSkeleton) {
            drawSkeleton(
              keypoints,
              minPartConfidence,
              clrList[i],
              skeletonLineWidth,
              ctx
            );
          }
        }
      });
    };

    poseDetectionFrameInner();
  }

  componentDidMount() {
    this.drawPose();
  }

  render() {
    const { poseRecords } = this.props;

    return (
      <div>
        <div
          style={{
            minHeight: "50vh",
            border: "2px solid salmon",
            backgroundColor: "#050517",
            maxWidth: 800,
            margin: "3rem auto"
          }}
        >
          <canvas ref={this.getCanvas} />
        </div>

        <div
          style={{
            height: "100%",
            maxWidth: 800,
            margin: "3rem auto",
            textAlign: "left",
            border: "1px dashed lightgrey",
            padding: "0 10px"
          }}
        >
          <ReactJson data={poseRecords} theme={googleTheme} />
        </div>
      </div>
    );
  }
}
