import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImagePopupProps {
    isOpen: boolean
    onClose: () => void
    imageUrl: string | null
    altText?: string
}

const ImagePopup: React.FC<ImagePopupProps> = ({
    isOpen,
    onClose,
    imageUrl,
    altText = 'Image'
}) => {
    if (!imageUrl) return null

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/95 border-0">
                <DialogHeader className="sr-only">
                    <DialogTitle>{altText}</DialogTitle>
                </DialogHeader>
                <div className="relative w-full h-full flex items-center justify-center">
                    {/* Close button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white border-0"
                        onClick={onClose}
                        onKeyDown={handleKeyDown}
                    >
                        <X className="h-5 w-5" />
                    </Button>

                    {/* Image */}
                    <img
                        src={imageUrl}
                        alt={altText}
                        className="max-w-full max-h-full object-contain"
                        onKeyDown={handleKeyDown}
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default ImagePopup
