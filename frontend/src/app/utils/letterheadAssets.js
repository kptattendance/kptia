"use client";

// =====================================================
// COLLEGE LETTERHEAD IMAGES (browser)
//
// Loads the three logos and draws the Kannada footer
// lines, for the PDF reports. See letterheadPdf.js for
// where they are placed.
// =====================================================

import { Noto_Sans_Kannada } from "next/font/google";

// Kannada lines of the letterhead footer
const kannadaFont = Noto_Sans_Kannada({
  subsets: ["kannada"],
  weight: ["400", "700"],
});

// =====================================================
// LETTERHEAD
// =====================================================

const LOGOS = {
  // College logo, left
  leftLogo:
    "https://res.cloudinary.com/dnreqxbdw/image/upload/v1757932916/logo3_vptob4.jpg",

  // Emblem of Karnataka, middle
  centerLogo:
    "https://res.cloudinary.com/dnreqxbdw/image/upload/v1757932915/logo5_czeuoz.png",

  // Platinum Jubilee logo, right
  rightLogo:
    "https://res.cloudinary.com/dnreqxbdw/image/upload/v1757932915/logo4_q0ujtn.png",
};

const KANNADA_FOOTER = [
  {
    text: "\u0c95\u0cb0\u0ccd\u0ca8\u0cbe\u0c9f\u0c95 (\u0cb8\u0cb0\u0ccd\u0c95\u0cbe\u0cb0\u0cbf) \u0caa\u0cbe\u0cb2\u0cbf\u0c9f\u0cc6\u0c95\u0ccd\u0ca8\u0cbf\u0c95\u0ccd (\u0cb8\u0ccd\u0cb5\u0cbe\u0caf\u0ca4\u0ccd\u0ca4), \u0cae\u0c82\u0c97\u0cb3\u0cc2\u0cb0\u0cc1",
    weight: 700,
    size: 46,
    color: "#991b34",
  },
  {
    text: "\u0c95\u0ca6\u0ccd\u0cb0\u0cbf \u0cb9\u0cbf\u0cb2\u0ccd\u0cb8\u0ccd, \u0cae\u0c82\u0c97\u0cb3\u0cc2\u0cb0\u0cc1 - 575004, \u0ca6\u0c95\u0ccd\u0cb7\u0cbf\u0ca3 \u0c95\u0ca8\u0ccd\u0ca8\u0ca1, \u0c95\u0cb0\u0ccd\u0ca8\u0cbe\u0c9f\u0c95",
    weight: 400,
    size: 40,
    color: "#64748b",
  },
];

// A logo, made smaller for the PDF. "" if it cannot load.
const loadLogo = (url, maxSize = 360) =>
  new Promise((resolve) => {
    const image = new window.Image();

    image.crossOrigin = "anonymous";

    image.onload = () => {
      try {
        const scale = Math.min(
          1,
          maxSize /
            Math.max(image.width, image.height)
        );

        const canvas = document.createElement("canvas");

        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        canvas
          .getContext("2d")
          .drawImage(
            image,
            0,
            0,
            canvas.width,
            canvas.height
          );

        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve("");
      }
    };

    image.onerror = () => resolve("");

    image.src = url;
  });

// The Kannada lines are drawn by the browser, which
// joins Kannada letters correctly; PDF fonts cannot.
const renderKannadaFooter = async () => {
  try {
    const family = kannadaFont.style.fontFamily;

    await Promise.all(
      KANNADA_FOOTER.map((line) =>
        document.fonts.load(
          `${line.weight} ${line.size}px ${family}`,
          line.text
        )
      )
    );

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    const font = (line) =>
      `${line.weight} ${line.size}px ${family}`;

    const width = Math.ceil(
      Math.max(
        ...KANNADA_FOOTER.map((line) => {
          context.font = font(line);
          return context.measureText(line.text).width;
        })
      ) + 20
    );

    const lineHeights = KANNADA_FOOTER.map(
      (line) => line.size * 1.45
    );

    canvas.width = width;
    canvas.height = Math.ceil(
      lineHeights.reduce((a, b) => a + b, 0)
    );

    let top = 0;

    KANNADA_FOOTER.forEach((line, index) => {
      context.font = font(line);
      context.fillStyle = line.color;
      context.textAlign = "center";
      context.textBaseline = "middle";

      context.fillText(
        line.text,
        width / 2,
        top + lineHeights[index] / 2
      );

      top += lineHeights[index];
    });

    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
};

// All letterhead images, ready for the PDF.
// Anything that fails to load is left out.
export const loadLetterhead = async () => {
  const [
    leftLogo,
    centerLogo,
    rightLogo,
    kannadaFooter,
  ] = await Promise.all([
    loadLogo(LOGOS.leftLogo),
    loadLogo(LOGOS.centerLogo),
    loadLogo(LOGOS.rightLogo),
    renderKannadaFooter(),
  ]);

  return {
    leftLogo,
    centerLogo,
    rightLogo,
    kannadaFooter,
  };
};
