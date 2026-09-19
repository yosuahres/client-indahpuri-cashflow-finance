"use client"

import { useRef, useState, useTransition } from "react"
import { Camera } from "lucide-react"

import { toast } from "@/components/ui/toast"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/cn"

import { setEmployeePhoto } from "../actions"
import { PHOTO_BUCKET, PHOTO_MAX_BYTES, PHOTO_TYPES } from "../constants"

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

/** The top of the details sidebar: photo, name and employee ID. Click the photo to change it. */
export function EmployeeProfile({
  id,
  fullName,
  employeeNo,
  photoUrl,
}: {
  id: string
  fullName: string
  employeeNo: string
  photoUrl: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [pending, startTransition] = useTransition()
  const busy = uploading || pending

  async function upload(file: File) {
    if (!PHOTO_TYPES.includes(file.type)) {
      toast.error("Use a JPG, PNG or WebP image.")
      return
    }
    if (file.size > PHOTO_MAX_BYTES) {
      toast.error("Keep the photo under 5 MB.")
      return
    }

    setUploading(true)
    const path = `${id}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`
    const { error: uploadError } = await createClient()
      .storage.from(PHOTO_BUCKET)
      .upload(path, file, { contentType: file.type })
    setUploading(false)

    if (uploadError) {
      toast.error(uploadError.message)
      return
    }

    startTransition(async () => {
      const result = await setEmployeePhoto(id, path)
      if (result.ok) toast.success("Photo updated.")
      else toast.error(result.error ?? "That photo could not be saved.")
    })
  }

  return (
    <div className="border-b border-black/8 p-5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={photoUrl ? `Change photo of ${fullName}` : `Upload photo of ${fullName}`}
        className="group relative grid size-28 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-black/5 bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
      >
        {photoUrl ? (
          // Signed links change on every visit, so there is nothing for the
          // image optimizer to cache.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="size-full object-cover" />
        ) : (
          <span aria-hidden className="text-5xl text-neutral-400">
            {fullName.trim().charAt(0).toLowerCase()}
          </span>
        )}
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 grid place-items-center bg-scrim/40 text-on-scrim transition-opacity",
            busy ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          {busy ? (
            <span className="text-xs font-medium">Uploading…</span>
          ) : (
            <Camera className="size-6" strokeWidth={1.75} />
          )}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0]
          // Cleared so picking the same file again still fires.
          event.target.value = ""
          if (file) void upload(file)
        }}
      />


      <p className="mt-4 truncate text-base font-semibold text-neutral-900">{fullName}</p>
      <p className="mt-1 truncate text-sm text-neutral-600 tabular-nums">{employeeNo}</p>
    </div>
  )
}
