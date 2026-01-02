'use client';

import Spline from '@splinetool/react-spline';

export default function HeroSpline() {
    return (
        <div className="w-full h-full min-h-[500px] flex justify-center items-center relative">
            <Spline
                // This is a placeholder Spline scene (a generic 3D shape)
                // You should replace this URL with your own 'Instagram Post' design from app.spline.design
                // Export -> Code -> React -> copy the scene url
                scene="https://prod.spline.design/mVUDWapG70G5tUyQ/scene.splinecode"
                className="w-full h-full"
            />
            {/* Fallback loading state if needed */}
            <div className="absolute inset-0 -z-10 bg-gray-50 dark:bg-zinc-800/50 animate-pulse rounded-2xl" />
        </div>
    );
}
