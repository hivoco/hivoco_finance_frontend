import * as React from "react"
import { UploadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

/** Button that opens a file picker and hands back a multipart FormData (`file=`). */
export function FileUploadButton({
  onFile,
  isPending,
  disabled,
  accept = ".pdf,.png,.jpg,.jpeg",
  children = "Upload",
}: {
  onFile: (formData: FormData) => void
  isPending?: boolean
  disabled?: boolean
  accept?: string
  children?: React.ReactNode
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const formData = new FormData()
          formData.append("file", file)
          onFile(formData)
          e.target.value = ""
        }}
      />
      <Button variant="outline" disabled={disabled || isPending} onClick={() => inputRef.current?.click()}>
        {isPending ? <Spinner /> : <UploadIcon />}
        {children}
      </Button>
    </>
  )
}

/** Stored S3 URLs are opaque (private bucket, no presigned endpoint yet). */
export function StoredFileLabel({ url }: { url?: string | null }) {
  if (!url) return <span className="text-muted-foreground">Not uploaded</span>
  if (url.startsWith("s3-pending://")) return <span>PDF pending</span>
  if (url.startsWith("s3-stub://")) return <span>Uploaded (storage stub)</span>
  return <span title={url}>Uploaded</span>
}
