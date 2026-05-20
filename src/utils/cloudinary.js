export const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'PgReview'); // The unsigned preset name provided by the user
  
  // Use 'auto' to automatically handle both images and videos
  const res = await fetch('https://api.cloudinary.com/v1_1/dnowmgeiq/auto/upload', {
    method: 'POST',
    body: formData
  });
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Media upload failed');
  }
  
  const data = await res.json();
  return data.secure_url; // the public HTTPS link to the file
};
