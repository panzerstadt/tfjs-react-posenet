import { extent } from "d3-array";
import { cosineSimilarity } from "./cosineSimilarity";

function remap(value, low1, high1, low2, high2) {
  return low2 + ((high2 - low2) * (value - low1)) / (high1 - low1);
}

// find bounding box of pose
const calculatePoseDomain = pose => {
  const keypoints = pose.keypoints;
  const x = keypoints.map(v => v.position.x);
  const y = keypoints.map(v => v.position.y);

  const xDomain = extent(x);
  const yDomain = extent(y);

  return { x: xDomain, y: yDomain };
};

// return an array of poses with current pose in the middle of array
// frameNumber == which point in time (of the poseSet) do you want to compare?
const findClosestPoses = (
  frameNumber,
  poseSet,
  count = 5,
  includeDist = false
) => {
  const index = frameNumber;
  // find n closest poses compared to input pose and its index
  const split = Math.round(count / 2);
  // the first item in leftHalf is the current index
  const leftHalf = Array(split)
    .fill(split)
    .map((v, i) => Math.max(index - i, 0));

  const rightHalf = Array(count - split)
    .fill(count - split)
    .map((v, i) => index + 1 + i);

  const closestNIndices = [...leftHalf, ...rightHalf].sort((a, b) => a - b);

  if (includeDist) {
    return closestNIndices.map((v, i) => {
      return {
        distance: Math.abs(index - v),
        index: v,
        pose: poseSet[v]
      };
    });
  } else {
    return closestNIndices.map(v => poseSet[v]);
  }
};

// convert pose into vector,
// option to resize to 0-1 for scoring
// option to ensure vector is length 34 (for tfjs posenet)
const vectorizePose = (pose, resize = true, cleanup = true) => {
  let arrayOut;

  if (!pose || pose.length === 0) return [];

  // maintain pose order
  const keypoints = pose.keypoints;
  // const keypoints = pose.keypoints.sort((a, b) => {
  //   const x = a.part;
  //   const y = b.part;

  //   if (x < y) return -1;
  //   if (x > y) return 1;
  //   return 0;
  // });

  // resize == remap x and y to 0 to 1
  if (resize) {
    const { x, y } = calculatePoseDomain(pose);
    const xMin = x[0];
    const xMax = x[1];
    const yMin = y[0];
    const yMax = y[1];

    //todo test this
    arrayOut = [].concat.apply(
      [],
      keypoints.map(v => [
        remap(v.position.y, yMin, yMax, 0, 1),
        remap(v.position.x, xMin, xMax, 0, 1)
      ])
    );
  } else {
    arrayOut = [].concat.apply(
      [],
      keypoints.map(v => [v.position.y, v.position.x])
    );
  }

  // ensure length === 34
  if (cleanup) {
    const len = arrayOut.length;
    if (len !== 34) {
      if (len < 34) {
        console.log(`current keypoint count is ${len}. should be 34.`);
      }
      arrayOut = arrayOut.slice(0, 34);
    }
  }

  return arrayOut;
};

const scoreSimilarity = (
  currentPose,
  currentTimeFrame,
  comparisonPoseSet,
  compareNearestFrames = 5,
  includeDistance = true,
  accuracyInDecimals = 4
) => {
  const PENALTY = 0.001;
  const c_Pose = vectorizePose(currentPose, true, true);

  // score nearest n poses with current pose
  const scoreFrames = findClosestPoses(
    currentTimeFrame,
    comparisonPoseSet,
    compareNearestFrames,
    includeDistance
  ).map((v, i) => {
    if (!v.pose) {
      return {
        distance: 1,
        score: 0,
        cosineSimilarity: 0,
        weightedSimilarity: 0,
        index: v.index
      };
    }

    const comparisonPose = vectorizePose(v.pose, true, true);
    const comparisonPoseConfidence = v.pose.score;
    const comparisonPoseDistance = v.distance;
    const comparisonPoseIndex = v.index;

    // cosine similarity
    const similarity = cosineSimilarity(c_Pose, comparisonPose).toFixed(
      accuracyInDecimals
    );
    // penalize by accuracy/confidence
    const weightedSimilarity = comparisonPoseConfidence * similarity;
    // also penalize by how many frame did you lag behind
    const finalSimilarity =
      weightedSimilarity - comparisonPoseDistance * PENALTY;

    return {
      distance: comparisonPoseDistance,
      score: finalSimilarity,
      cosineSimilarity: similarity,
      weightedSimilarity: weightedSimilarity,
      index: comparisonPoseIndex
    };
  });

  const highestScore = scoreFrames
    .map(v => v.score)
    .sort((a, b) => a - b)
    .reverse()[0];
  const currentFrameScore = scoreFrames.filter(v => v.distance === 0)[0].score;

  return {
    score: {
      normalized: Math.max(remap(highestScore, 0.85, 1.0, 0, 100), 0),
      highest: highestScore,
      current: currentFrameScore,
      all: scoreFrames
    }
  };
};

export default scoreSimilarity;
