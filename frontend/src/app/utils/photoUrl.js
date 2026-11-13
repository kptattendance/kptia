// =====================================================
// LIGHT PHOTOS
//
// Photos are stored on Cloudinary at their original
// size (a phone photo can be several MB). Cloudinary
// can send a resized, compressed copy instead, just by
// adding a few words to the link:
//
//   photoUrl(url)           small round thumbnail (96 px)
//   photoUrl(url, 240)      profile picture
//   photoUrl(url, "large")  enlarged view (max 900 px)
//
// q_auto picks the quality, f_auto sends WebP/AVIF to
// browsers that support them. A table of 60 students
// then loads a few hundred KB instead of many MB.
//
// Links that are not Cloudinary uploads (Clerk photos,
// previews of a file being picked) are left as they are.
// =====================================================

const UPLOAD = "/image/upload/";

export const photoUrl = (url, size = 96) => {
  if (
    typeof url !== "string" ||
    !url.includes("res.cloudinary.com") ||
    !url.includes(UPLOAD)
  ) {
    return url;
  }

  // Already resized
  const rest = url.split(UPLOAD)[1] || "";

  if (/^(c_|w_|h_|q_|f_|t_)/.test(rest)) {
    return url;
  }

  const transform =
    size === "large"
      ? "c_limit,w_900,h_900,q_auto,f_auto"
      : `c_fill,g_face,w_${size},h_${size},q_auto,f_auto`;

  return url.replace(UPLOAD, `${UPLOAD}${transform}/`);
};
