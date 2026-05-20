// User Photo Upload Collection Schema
// Collection: pg_photos
// Document structure for user-uploaded PG photos

interface PGPhoto {
  id: string;
  pgId: string; // Reference to the PG
  userId: string; // Who uploaded
  imageURL: string; // Cloudinary URL
  thumbnailURL?: string; // Smaller version for previews
  photoType: 'exterior' | 'interior' | 'room' | 'common-area' | 'food' | 'before-after';
  caption?: string;
  isVerified: boolean; // Admin verified
  verificationStatus: 'pending' | 'approved' | 'rejected';
  verifiedBy?: string; // Admin user ID
  verifiedAt?: Date;
  tags: string[]; // ['clean', 'modern', 'spacious', etc.]
  location?: {
    latitude: number;
    longitude: number;
  };
  beforeAfterPair?: {
    beforePhotoId: string;
    afterPhotoId: string;
    description: string;
  };
  metadata: {
    uploadDate: Date;
    fileSize: number;
    dimensions: {
      width: number;
      height: number;
    };
  };
  moderation: {
    flags: number; // Number of user reports
    isHidden: boolean;
    hiddenReason?: string;
  };
}