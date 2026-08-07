import { CustomMDX } from "@/components";

export default function MdxZoomTestPage() {
  return (
    <CustomMDX
      source={`# Zoom Test

Some text before.

<img src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=85" width="100%" alt="Open landscape representing the future">

And honestly, **I'm okay with that.**

![markdown image](https://example.com/md.jpg)`}
    />
  );
}
