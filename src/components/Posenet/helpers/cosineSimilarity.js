export const magnitude = vec => {
  const squaredTotal = vec.map(num => Math.pow(num, 2)).reduce((a, b) => a + b); // sum of squares
  const mag = Math.sqrt(squaredTotal); // squared root
  return mag;
};

export const dotProduct = (vec1, vec2) => {
  if (vec1.length !== vec2.length) {
    throw new Error(
      "vector lengths are not similar. please make sure vector 1 and vector 2 have the same length."
    );
  }
  const sumOfMultiplications = vec1
    .map((vec, i) => vec * vec2[i]) // multiply each scalar in the vector
    .reduce((a, b) => a + b); // sum
  return sumOfMultiplications;
};

export const cosineSimilarity = (vector1, vector2) => {
  const sim =
    dotProduct(vector1, vector2) / (magnitude(vector1) * magnitude(vector2));
  return sim;
};
