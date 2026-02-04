import { useState, useRef } from 'react';

interface ImageUploadProps {
    onImageSelected: (file: File) => void;
    currentImage?: string;
    label?: string;
}

export function ImageUpload({ onImageSelected, currentImage, label = "Upload Image" }: ImageUploadProps) {
    const [preview, setPreview] = useState<string | null>(currentImage || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Create local preview
            const objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);
            onImageSelected(file);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="form-group">
            <label className="form-label">{label}</label>
            <div
                onClick={handleClick}
                style={{
                    border: '2px dashed #ccc',
                    borderRadius: '8px',
                    padding: '1rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    minHeight: '150px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: preview ? `url(${preview}) center/contain no-repeat` : '#f9f9f9',
                    position: 'relative'
                }}
            >
                {!preview && (
                    <>
                        <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</span>
                        <span style={{ color: '#666' }}>Click para subir logo</span>
                    </>
                )}
                {preview && (
                    <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        background: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        padding: '4px',
                        fontSize: '12px',
                        borderBottomLeftRadius: '6px',
                        borderBottomRightRadius: '6px'
                    }}>
                        Click to change
                    </div>
                )}
            </div>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
        </div>
    );
}
