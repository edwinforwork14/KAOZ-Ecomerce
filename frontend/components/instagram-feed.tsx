"use client"

import { useEffect, useState } from "react"
import { Instagram } from "lucide-react"
import { api } from "@/lib/api"

interface InstagramPost {
  id: string
  picture: string
  permalink: string
  message?: string
  likeCount?: number
  commentCount?: number
}

export default function InstagramFeed() {
  const [posts, setPosts] = useState<InstagramPost[]>([])
  const [username, setUsername] = useState("kaos.vzla")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadFeed() {
      try {
        const res = await api.getInstagramPosts()
        if (res?.success && Array.isArray(res.posts)) {
          setPosts(res.posts)
          if (res.username) {
            setUsername(res.username)
          }
        }
      } catch (error) {
        console.error("❌ [INSTAGRAM FEED] Error loading posts:", error)
      } finally {
        setLoading(false)
      }
    }
    loadFeed()
  }, [])

  return (
    <section className="max-w-[1440px] mx-auto px-4 md:px-10 py-10" data-purpose="instagram-feed">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 flex items-center justify-center border-2 border-black rounded-xl bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-300">
          <Instagram className="w-6 h-6 text-black" />
        </div>
        <div>
          <h3 className="font-black text-sm lowercase tracking-tight">@{username}</h3>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Síguenos en Instagram</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {loading ? (
          // Stark skeleton loader
          Array.from({ length: 7 }).map((_, idx) => (
            <div 
              key={idx} 
              className="aspect-square bg-gray-100 animate-pulse rounded-lg border border-black/5"
            />
          ))
        ) : posts.length > 0 ? (
          posts.map((post, idx) => (
            <a 
              key={post.id || idx} 
              href={post.permalink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="aspect-square overflow-hidden bg-gray-100 rounded-lg border border-black/10 group relative block"
            >
              <img 
                alt={`Instagram Post ${idx + 1}`} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                src={post.picture} 
              />
              {/* Premium Glassmorphic Overlay */}
              <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-4 text-white font-mono text-[9px]">
                <div className="line-clamp-3 leading-tight uppercase font-bold text-white/90">
                  {post.message || "VER EN INSTAGRAM"}
                </div>
                <div className="flex justify-between font-black text-yellow-400 pt-2 border-t border-white/10 uppercase tracking-wider text-[8px]">
                  <span>❤️ {post.likeCount || 0}</span>
                  <span>💬 {post.commentCount || 0}</span>
                </div>
              </div>
            </a>
          ))
        ) : (
          <div className="col-span-full py-10 text-center border-2 border-dashed border-black/20 rounded-xl bg-gray-50">
            <p className="text-xs font-black uppercase text-gray-400">No se pudieron cargar publicaciones de Instagram</p>
          </div>
        )}
      </div>
    </section>
  )
}

