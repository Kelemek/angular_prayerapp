import { Injectable } from '@angular/core';

/**
 * Image compression options
 */
export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: 'jpeg' | 'webp' | 'png';
}

/**
 * Image optimization result
 */
export interface OptimizedImage {
  original: {
    size: number;
    format: string;
  };
  compressed: {
    size: number;
    format: string;
    base64: string;
    blob: Blob;
  };
  savings: {
    bytes: number;
    percent: number;
  };
}

/**
 * ImageOptimizationService provides utilities for image compression and optimization.
 * 
 * Features:
 * - Image compression with configurable quality
 * - Format conversion (JPEG, WebP, PNG)
 * - Responsive image generation
 * - Base64 encoding for embedded images
 * - WebP detection and fallback support
 * - File size metrics and savings calculation
 * 
 * Usage:
 * ```typescript
 * const optimized = await this.imageOptimization.compressImage(
 *   file,
 *   { maxWidth: 500, quality: 0.8, format: 'webp' }
 * );
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class ImageOptimizationService {
  private webpSupported: boolean | null = null;

  /**
   * Compress image with specified options
   */
  async compressImage(
    file: File | Blob,
    options: ImageCompressionOptions = {}
  ): Promise<OptimizedImage> {
    const {
      maxWidth = 1920,
      maxHeight = 1440,
      quality = 0.8,
      format = 'webp'
    } = options;

    // Read file as data URL
    const originalBase64 = await this.fileToBase64(file);
    const originalSize = file.size;
    const originalFormat = this.getImageFormat(file);

    // Create image element
    const img = new Image();
    img.src = originalBase64;

    // Wait for image to load
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    // Calculate new dimensions (maintain aspect ratio)
    const { width, height } = this.calculateDimensions(
      img.width,
      img.height,
      maxWidth,
      maxHeight
    );

    // Create canvas and compress
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(img, 0, 0, width, height);

    // Convert to desired format
    const mimeType = this.getMimeType(format);
    const compressedBase64 = canvas.toDataURL(mimeType, quality);
    const compressedBlob = await this.dataUrlToBlob(compressedBase64);

    return {
      original: {
        size: originalSize,
        format: originalFormat
      },
      compressed: {
        size: compressedBlob.size,
        format: format,
        base64: compressedBase64,
        blob: compressedBlob
      },
      savings: {
        bytes: originalSize - compressedBlob.size,
        percent: ((originalSize - compressedBlob.size) / originalSize) * 100
      }
    };
  }

  /**
   * Generate responsive image srcset
   */
  async generateResponsiveImages(
    file: File | Blob,
    sizes: number[] = [320, 640, 1280],
    format: 'jpeg' | 'webp' | 'png' = 'webp'
  ): Promise<Array<{ size: number; base64: string; blob: Blob }>> {
    const results = [];

    for (const size of sizes) {
      const optimized = await this.compressImage(file, {
        maxWidth: size,
        maxHeight: size,
        quality: 0.8,
        format
      });

      results.push({
        size,
        base64: optimized.compressed.base64,
        blob: optimized.compressed.blob
      });
    }

    return results;
  }

  /**
   * Check if WebP format is supported
   */
  async isWebPSupported(): Promise<boolean> {
    if (this.webpSupported !== null) {
      return this.webpSupported;
    }

    const webpTest = new Image();
    webpTest.src = 'data:image/webp;base64,UklGRjoIAABXQVBQRUAAAABQQMAg';

    return new Promise(resolve => {
      webpTest.onload = () => {
        this.webpSupported = true;
        resolve(true);
      };
      webpTest.onerror = () => {
        this.webpSupported = false;
        resolve(false);
      };
    });
  }

  /**
   * Get optimal format (WebP if supported, fallback to JPEG)
   */
  async getOptimalFormat(): Promise<'webp' | 'jpeg'> {
    const supported = await this.isWebPSupported();
    return supported ? 'webp' : 'jpeg';
  }

  /**
   * Convert file to base64 string
   */
  private fileToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convert data URL to blob
   */
  private dataUrlToBlob(dataUrl: string): Promise<Blob> {
    return fetch(dataUrl).then(res => res.blob());
  }

  /**
   * Calculate new dimensions maintaining aspect ratio
   */
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let width = originalWidth;
    let height = originalHeight;

    // Resize if larger than max
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }

    if (height > maxHeight) {
      width = Math.round((width * maxHeight) / height);
      height = maxHeight;
    }

    return { width, height };
  }

  /**
   * Get MIME type for format
   */
  private getMimeType(
    format: 'jpeg' | 'webp' | 'png'
  ): 'image/jpeg' | 'image/webp' | 'image/png' {
    const mimeTypes: { [key in 'jpeg' | 'webp' | 'png']: 'image/jpeg' | 'image/webp' | 'image/png' } = {
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      png: 'image/png'
    };
    return mimeTypes[format];
  }

  /**
   * Get image format from file
   */
  private getImageFormat(file: File | Blob): string {
    if (file instanceof File) {
      return file.type;
    }
    return 'blob';
  }

  /**
   * Create srcset string from responsive images
   */
  createSrcSet(images: Array<{ size: number; base64: string }>): string {
    return images
      .map(img => `${img.base64} ${img.size}w`)
      .join(', ');
  }

  /**
   * Format bytes for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
