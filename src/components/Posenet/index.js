// ref: https://github.com/jscriptcoder/tfjs-posenet/blob/master/src/PoseNet/index.jsx

// main imports
import React, { Component } from "react";
import * as posenet from "@tensorflow-models/posenet";
import Camera from "react-html5-camera-photo";
import ReactJson from "react-json-tree";

// styles
import styles from "./index.module.css";
// google theme
import { googleTheme } from "./helpers/themes";
import { colourNameToHex, getColorOpacityRangeHex } from "./helpers/color";

// components
import { isMobile, drawKeypoints, drawSkeleton } from "./utils";
import Scrubber from "./helpers/SliderScrubber";
import download from "./helpers/download";
import { sendEmail } from "./helpers/share";

// constants
import { DEBUG } from "../../lib/constants";

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
    record: false,
    recordVideo: false
  };

  state = {
    loading: true,
    error_messages: "",
    stream: null,
    trace: [],
    frames: []
  };
  camera = undefined;
  traceVideo = this.traceVideo.bind(this);

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

  getVideoRecords() {
    if (this.props.getVideoRecords) {
      this.props.getVideoRecords(this.state.frames);
    }
  }

  tracePose(poses) {
    if (this.props.record) {
      this.setState({ trace: [...this.state.trace, ...poses] });
    }
  }

  traceVideo(blob) {
    if (this.props.record) {
      this.setState({ frames: [...this.state.frames, blob] });
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
        // console.log(poses);

        if (this.props.record) {
          if (this.props.recordVideo) {
            console.log("recording frame and video!");
          } else {
            console.log("recording frames!");
          }
          // trace
          this.tracePose(poses);
          // record video
          this.canvas.toBlob(this.traceVideo, "image/jpeg", 0.4);

          // stream poses to parent
          this.getPoseRecords();
          this.getVideoRecords();
        }

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
  state = {
    loadedPoseRecords: [],
    loadedPoseVideo: []
  };

  fileReader;
  onChange = this.onChange.bind(this);
  loadData = this.loadData.bind(this);
  handleFileRead = this.handleFileRead.bind(this);

  getCanvas = elem => {
    this.canvas = elem;
  };

  drawPose(range) {
    const { videoWidth, videoHeight } = this.props;
    const canvas = this.canvas;
    const ctx = canvas.getContext("2d");

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    this.poseDrawFrame(ctx, range);
  }

  poseDrawFrame(ctx, range) {
    const {
      minPoseConfidence,
      minPartConfidence,
      videoWidth,
      videoHeight,
      showPoints,
      showSkeleton,
      skeletonColor,
      skeletonLineWidth,
      showVideo,
      flipped
    } = this.props;

    let { poseRecords, poseVideo } = this.props;

    if (poseRecords.length === 0 && this.state.loadedPoseRecords.length > 1) {
      poseRecords = this.state.loadedPoseRecords;
    }

    if (poseVideo.length === 0 && this.state.loadedPoseVideo.length > 1) {
      poseVideo = this.state.loadedPoseVideo;
    }

    const poseDetectionFrameInner = async () => {
      const drawPoses = () => {
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

      let poses = [];
      poses = range ? poseRecords.slice(range.min, range.max) : poseRecords;

      let video = [];

      if (range) {
        poses = poseRecords.slice(range.min, range.max);

        if (poseVideo) {
          video = poseVideo.slice(range.min, range.max);
        }
      } else {
        poses = poseRecords;

        if (poseVideo) {
          video = poseVideo;
        }
      }
      video = video[video.length - 1];

      const clrRange = poses.length;
      let clr = colourNameToHex(skeletonColor) || "#cccccc";

      const clrList = getColorOpacityRangeHex(clrRange, clr);
      clrList.reverse()[0] = "#fff";
      clrList.reverse();

      if (showVideo && poseVideo.length > 1 && poses.length > 1) {
        // turn blob into data
        const frame = document.createElement("img");
        const url = URL.createObjectURL(video);

        frame.src = url;

        // temp draw
        // frame.id = "frame";
        // frame.height = 300;
        // document.getElementById("frame").replaceWith(frame);

        frame.onload = () => {
          // why? : https://stackoverflow.com/questions/12387310/html5-drawimage-works-in-firefox-not-chrome

          ctx.clearRect(0, 0, videoWidth, videoHeight);
          // draw
          ctx.save();
          if (flipped) {
            // https://christianheilmann.com/2013/07/19/flipping-the-image-when-accessing-the-laptop-camera-with-getusermedia/
            ctx.scale(-1, 1);
            ctx.translate(-videoWidth, 0);
          }
          ctx.drawImage(frame, 0, 0, videoWidth, videoHeight);
          ctx.restore();

          drawPoses();

          URL.revokeObjectURL(url);
        };
      } else {
        // no video
        ctx.clearRect(0, 0, videoWidth, videoHeight);
        drawPoses();
      }
    };

    requestAnimationFrame(poseDetectionFrameInner);
  }

  componentDidMount() {
    this.drawPose();
  }

  onChange(range) {
    this.drawPose(range);
  }

  handleFileRead(e) {
    const content = JSON.parse(this.fileReader.result);
    this.setState({
      loadedPoseRecords: content.poseRecords || content || [], // content is for backward compatibility
      loadedPoseVideo: content.poseVideo || []
    });
  }

  loadData(e) {
    this.fileReader = new FileReader();
    this.fileReader.onloadend = this.handleFileRead;

    // run it
    this.fileReader.readAsText(e.target.files[0]);
  }

  render() {
    let { poseRecords, poseVideo } = this.props;

    if (poseRecords.length === 0 && this.state.loadedPoseRecords.length > 1) {
      poseRecords = this.state.loadedPoseRecords;
    }

    if (poseVideo.length === 0 && this.state.loadedPoseVideo.length > 1) {
      poseVideo = this.state.loadedPoseVideo;
    }

    return (
      <div>
        <div
          style={{
            backgroundColor: "#050517",
            maxWidth: 800,
            overflow: "hidden"
          }}
        >
          <div>
            <canvas ref={this.getCanvas} />
          </div>

          <Scrubber onChange={this.onChange} range={poseRecords.length} />
        </div>

        {/* temporarily show image for debug */}
        {/* <div style={{ height: 300 }}>
          <div id="frame" />
        </div> */}
        {poseRecords.length > 1 ? (
          <div>
            <div
              className={styles.download}
              style={{
                maxWidth: 800,

                margin: "0 auto",
                display: "flex"
              }}
            >
              <button
                className={styles.button}
                onClick={() =>
                  download(
                    JSON.stringify({
                      poseRecords: poseRecords,
                      poseVideo: []
                    }),
                    "temp.json"
                  )
                }
              >
                download data
              </button>

              <button
                className={styles.button}
                onClick={async () => {
                  await sendEmail({
                    subject: "GWARA GWARA!",
                    message: "I challenge you! GAWRRR!",
                    from: "Rahmat Hidayat"
                  });
                  alert("challenge sent!");
                }}
              >
                send challenge
              </button>
              <button
                className={styles.button}
                onClick={() =>
                  this.setState({ loadedPoseRecords: [], loadedPoseVideo: [] })
                }
              >
                clear data
              </button>
            </div>
          </div>
        ) : (
          <div
            className={styles.download}
            style={{ maxWidth: 800, padding: "10px 0", margin: "0 auto" }}
          >
            <input
              type="file"
              name="pose records upload"
              accept=".json"
              onChange={this.loadData}
            />
          </div>
        )}

        {DEBUG ? (
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
        ) : (
          ""
        )}
      </div>
    );
  }
}

export class PoseNetMatch extends Component {
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
    record: false,
    recordVideo: false
  };

  state = {
    loading: true,
    error_messages: "",
    stream: null,
    trace: [],
    frames: [],
    height: 0,
    width: 0
  };
  traceVideo = this.traceVideo.bind(this);

  tracePose(poses) {
    if (this.props.record) {
      this.setState({ trace: [...this.state.trace, ...poses] });
    }
  }

  traceVideo(blob) {
    if (this.props.record) {
      this.setState({ frames: [...this.state.frames, blob] });
    }
  }

  getCanvas = elem => {
    this.canvas = elem;
  };

  getVideo = elem => {
    this.video = elem;
  };

  onStream(v) {
    console.log("streaming data");
    console.log(v);
  }

  setDims(h, w) {
    this.setState({ height: h, width: w });
  }

  detectPose() {
    const { width, height } = this.state;
    const canvas = this.canvas;
    const ctx = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;

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
        // console.log(poses);

        if (this.props.record) {
          if (this.props.recordVideo) {
            console.log("recording frame and video!");
          } else {
            console.log("recording frames!");
          }
          // trace
          this.tracePose(poses);
          // record video
          this.canvas.toBlob(this.traceVideo, "image/jpeg", 0.4);

          // stream poses to parent
          this.getPoseRecords();
          this.getVideoRecords();
        }

        // call next recursion
        requestAnimationFrame(poseDetectionFrameInner);
      }
    };

    poseDetectionFrameInner();
  }

  async onCameraStart(stream) {
    const track = stream.getVideoTracks()[0].getSettings();
    this.net = await posenet.load(this.props.mobileNetArchitecture);

    this.setDims(track.height, track.width);

    this.onStream(stream);
    this.detectPose();
  }

  // async componentDidMount() {
  //   console.log("loaded mobilenet");
  //   console.log(this.net);
  // }

  render() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    return (
      <div>
        <p>match</p>
        <p>width: {width}</p>
        <p>height: {height}</p>

        <Camera

        // onCameraStart={stream => {
        //   this.onCameraStart(stream);
        // }}
        />

        <canvas ref={this.getCanvas} />
      </div>
    );
  }
}
