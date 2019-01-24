//https://stackoverflow.com/questions/34156282/how-do-i-save-json-to-local-text-file

const download = (
  content,
  fileName = "json.txt",
  contentType = "text/plain"
) => {
  let a = document.createElement("a");
  let file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
};

export default download;
