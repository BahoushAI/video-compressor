// ===== Local Access Gate =====
const APP_ACCESS_PASSWORD = "9090";
const APP_ACCESS_KEY = "video-compressor-access";

if (localStorage.getItem(APP_ACCESS_KEY) !== "granted") {
  document.documentElement.style.visibility = "hidden";

  const password = window.prompt("رمز ورود را وارد کنید:");

  if (password === APP_ACCESS_PASSWORD) {
    localStorage.setItem(APP_ACCESS_KEY, "granted");
    document.documentElement.style.visibility = "";
  } else {
    document.documentElement.innerHTML = `
      <body style="
        margin:0;
        min-height:100vh;
        display:flex;
        align-items:center;
        justify-content:center;
        font-family:sans-serif;
        direction:rtl;
        text-align:center;
      ">
        <div>
          <h2>دسترسی غیرمجاز</h2>
          <p>رمز ورود صحیح نیست.</p>
        </div>
      </body>
    `;
    throw new Error("ACCESS_DENIED");
  }
}
// ===== End Local Access Gate =====

import { Input, Output, Conversion, ALL_FORMATS, BufferSource, Mp4OutputFormat, BufferTarget, Quality } from "mediabunny";

const videoInput = document.getElementById("videoInput");
const selectBtn = document.getElementById("selectBtn");
const compressBtn = document.getElementById("compressBtn");
const status = document.getElementById("status");
const saveLink = document.getElementById("saveLink");

let selectedFile = null;
let selectedFileData = null;
let previousOutputURL = null;

function formatSize(bytes) {
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + " KB";
  }

  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

function showProgress(percent) {
  if (!selectedFile) return;

  const value = Math.min(
    99,
    Math.max(0, Math.round(percent))
  );

  status.innerHTML = `
    <div>
      <b>در حال کاهش حجم: ${value}%</b>

      <div style="
        width:100%;
        height:12px;
        background:#eee;
        border-radius:10px;
        overflow:hidden;
        margin-top:10px;
      ">
        <div style="
          width:${value}%;
          height:100%;
          background:#ff7a00;
          transition:width .2s;
        "></div>
      </div>

      <div style="margin-top:12px">
        حجم اولیه:
        <b>${formatSize(selectedFile.size)}</b>
      </div>
    </div>
  `;
}

selectBtn.addEventListener("click", () => {
  videoInput.click();
});

videoInput.addEventListener("change", () => {
  if (!videoInput.files || videoInput.files.length === 0) {
    return;
  }

  selectedFile = videoInput.files[0];
  selectedFileData = null;

  if (previousOutputURL) {
    URL.revokeObjectURL(previousOutputURL);
    previousOutputURL = null;
  }

  saveLink.style.display = "none";
  saveLink.removeAttribute("href");

  compressBtn.style.display = "none";
  compressBtn.disabled = true;

  status.innerHTML = "در حال خواندن فیلم...";

  const reader = new FileReader();

  reader.onload = () => {
    if (!(reader.result instanceof ArrayBuffer)) {
      selectedFile = null;
      selectedFileData = null;

      status.innerHTML =
        "❌ داده فایل قابل خواندن نیست.";

      return;
    }

    selectedFileData =
      new Uint8Array(reader.result);

    if (selectedFileData.length === 0) {
      selectedFile = null;
      selectedFileData = null;

      status.innerHTML =
        "❌ فایل خالی است.";

      return;
    }

    status.innerHTML = `
      حجم اولیه:
      <b>${formatSize(selectedFile.size)}</b>
    `;

    compressBtn.style.display = "block";
    compressBtn.disabled = false;
  };

  reader.onerror = () => {
    console.error(
      "FILE READ ERROR:",
      reader.error
    );

    selectedFile = null;
    selectedFileData = null;

    status.innerHTML = `
      <div style="color:red">
        ❌ فایل قابل خواندن نیست
        <br><br>
        ${reader.error?.message || "خطای خواندن فایل"}
      </div>
    `;
  };

  reader.onabort = () => {
    selectedFile = null;
    selectedFileData = null;

    status.innerHTML =
      "❌ خواندن فایل لغو شد.";
  };

  reader.readAsArrayBuffer(selectedFile);
});

compressBtn.addEventListener("click", async () => {
  if (!selectedFile || !selectedFileData) {
    status.innerHTML =
      "❌ اطلاعات فایل آماده نیست.";

    return;
  }

  compressBtn.disabled = true;
  saveLink.style.display = "none";

  try {
    status.innerHTML = "در حال فشرده‌سازی سریع با WebCodecs...";


    const input = new Input({
      source: new BufferSource(selectedFileData),
      formats: ALL_FORMATS,
    });

    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget(),
    });

    const conversion = await Conversion.init({
      input,
      output,
      video: {
        quality: new Quality("low"),
        hardwareAcceleration: "prefer-hardware",
        forceTranscode: true,
      },
      audio: {
        quality: new Quality({
          bitrate: 128000,
        }),
      },
    });

    conversion.onProgress = (progress) => {
      const percent = Math.round(progress * 100);
      status.innerHTML = `در حال فشرده‌سازی سریع... ${percent}%`;
    };

    await conversion.execute();

    const outputBuffer = output.target.buffer;

    if (!outputBuffer || outputBuffer.byteLength === 0) {
      throw new Error("فایل خروجی ساخته نشد.");
    }

    const outputBlob = new Blob([outputBuffer], {
      type: "video/mp4",
    });

    if (outputBlob.size === 0) {
      throw new Error("فایل خروجی خالی است.");
    }

    const originalMB = selectedFile.size / 1024 / 1024;
    const finalMB = outputBlob.size / 1024 / 1024;
    const reducedMB = Math.max(0, originalMB - finalMB);
    const reducedPercent =
      originalMB > 0 ? (reducedMB / originalMB) * 100 : 0;

    if (previousOutputURL) {
      URL.revokeObjectURL(previousOutputURL);
    }

    previousOutputURL = URL.createObjectURL(outputBlob);

    const compressedName =
      selectedFile.name.replace(/\.[^/.]+$/, "") + "-compressed.mp4";

    saveLink.href = previousOutputURL;
    saveLink.download = compressedName;
    saveLink.textContent = "ذخیره فیلم در گوشی";
    saveLink.style.display = "block";

    saveLink.onclick = async (event) => {
      if (!navigator.share || !window.File) return;

      event.preventDefault();

      try {
        const file = new File(
          [outputBlob],
          compressedName,
          { type: "video/mp4" }
        );

        if (navigator.canShare && !navigator.canShare({ files: [file] })) {
          return;
        }

        await navigator.share({
          files: [file],
          title: "فیلم فشرده‌شده",
          text: "فیلم فشرده‌شده را ذخیره کنید"
        });
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.error("SAVE ERROR:", error);
        }
      }
    };

    status.innerHTML =
      `تمام شد ✅<br>` +
      `حجم اصلی: ${originalMB.toFixed(2)} MB<br>` +
      `حجم نهایی: ${finalMB.toFixed(2)} MB<br>` +
      `کاهش حجم: ${reducedMB.toFixed(2)} MB (${reducedPercent.toFixed(1)}%)`;

    console.log("Compression completed:", {
      originalBytes: selectedFile.size,
      outputBytes: outputBlob.size,
      reductionPercent: reducedPercent,
    });

  } catch (error) {
    console.error(
      "FFmpeg ERROR:",
      error
    );

    status.innerHTML = `
      <div style="color:red">
        ❌ خطا در پردازش فیلم
        <br><br>
        <small>
          ${error?.message || error}
        </small>
      </div>
    `;

  } finally {
    compressBtn.disabled = false;
  }
});
