import GeometricLoader from '@/components/ui/geometric-loader'

export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <div className="text-center">
                <GeometricLoader size="lg" />
                <p className="mt-4 text-gray-600 text-sm">Loading...</p>
            </div>
        </div>
    )
}
