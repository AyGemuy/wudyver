import {
  FormData,
  Blob
} from "formdata-node";
import {
  fileTypeFromBuffer
} from "file-type";
import fetch from "node-fetch";
const uploadFaceSwap = async mediaBuffer => {
  try {
    console.log("Starting uploadFaceSwap...");
    const fileType = await fileTypeFromBuffer(mediaBuffer);
    const mimeType = fileType ? fileType.mime : "image/jpeg";
    const fileName = `img.${fileType ? fileType.ext : "jpeg"}`;
    const formData = new FormData();
    formData.append("file", new Blob([mediaBuffer], {
      type: mimeType
    }), fileName);
    const response = await fetch("https://aifaceswap.io/api/upload_img", {
      method: "POST",
      headers: {
        Accept: "*/*",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Referer: "https://aifaceswap.io/"
      },
      body: formData
    });
    const data = await response.json();
    if (data.code !== 200) throw new Error("Failed to upload image.");
    console.log("Image uploaded successfully:", "aifaceswap/upload_res/" + data.data);
    return data.data;
  } catch (error) {
    console.error("Error in uploadFaceSwap:", error);
    throw error;
  }
};
const generateFace = async (source_image, face_image) => {
  try {
    console.log("Starting generateFace...");
    const response = await fetch("https://aifaceswap.io/api/generate_face", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Referer: "https://aifaceswap.io/"
      },
      body: JSON.stringify({
        source_image: source_image,
        face_image: face_image
      })
    });
    const data = await response.json();
    if (data.code !== 200) throw new Error("Failed to initiate face swap task.");
    const taskId = data.data.task_id;
    console.log("Face swap task initiated with ID:", taskId);
    let resultImage;
    let attempts = 0;
    const maxAttempts = 15;
    do {
      try {
        console.log("Checking task status... Attempt:", attempts + 1);
        const statusResponse = await fetch("https://aifaceswap.io/api/check_status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
            Referer: "https://aifaceswap.io/"
          },
          body: JSON.stringify({
            task_id: taskId
          })
        });
        const statusData = await statusResponse.json();
        if (statusData.code !== 200) throw new Error("Failed to check task status.");
        resultImage = statusData.data.result_image;
        if (!resultImage) {
          if (++attempts >= maxAttempts) {
            throw new Error("Maximum attempts reached. Result image not available.");
          }
          console.log("Result image not available yet. Waiting...");
          await new Promise(resolve => setTimeout(resolve, 5e3));
        }
      } catch (statusError) {
        console.error("Error in status check:", statusError);
        throw statusError;
      }
    } while (!resultImage);
    console.log("Result image obtained:", "https://art-global.yimeta.ai/" + resultImage);
    return "https://art-global.yimeta.ai/" + resultImage;
  } catch (error) {
    console.error("Error in generateFace:", error);
    throw error;
  }
};
export default async function handler(req, res) {
  if (req.method === "GET") {
    const {
      sourceUrl,
      faceUrl
    } = req.method === "GET" ? req.query : req.body;
    if (!sourceUrl || !faceUrl) {
      return res.status(400).json({
        error: "Missing sourceUrl or faceUrl"
      });
    }
    try {
      console.log("Fetching source image...");
      const sourceResponse = await fetch(sourceUrl);
      const sourceBuffer = Buffer.from(await sourceResponse.arrayBuffer());
      console.log("Uploading source image...");
      const sourceImage = await uploadFaceSwap(sourceBuffer);
      console.log("Fetching face image...");
      const faceResponse = await fetch(faceUrl);
      const faceBuffer = Buffer.from(await faceResponse.arrayBuffer());
      console.log("Uploading face image...");
      const faceImage = await uploadFaceSwap(faceBuffer);
      console.log("Generating face swap...");
      const resultImageUrl = await generateFace(sourceImage, faceImage);
      res.status(200).json({
        result: resultImageUrl
      });
    } catch (error) {
      console.error("Error during face swap process:", error);
      res.status(500).json({
        error: "An error occurred during the face swap process."
      });
    }
  } else {
    res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}