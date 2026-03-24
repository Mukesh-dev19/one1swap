import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, Image as ImageIcon, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const UploadResource = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "", condition: "", type: "", price: "", location: "" });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    const newFiles = Array.from(fileList);
    setImages((prev) => [...prev, ...newFiles]);
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setPreviews((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    setFiles((prev) => [...prev, ...Array.from(fileList)]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.category || !form.type) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if (!user) return;

    setLoading(true);

    // Upload images
    const imageUrls: string[] = [];
    for (const file of images) {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("resource-images").upload(filePath, file);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("resource-images").getPublicUrl(filePath);
        imageUrls.push(urlData.publicUrl);
      }
    }

    // Upload files (PDFs, notes)
    const fileUrls: string[] = [];
    for (const file of files) {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("resource-files").upload(filePath, file);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("resource-files").getPublicUrl(filePath);
        fileUrls.push(urlData.publicUrl);
      }
    }

    const { error } = await supabase.from("resources").insert({
      user_id: user.id,
      title: form.title,
      description: form.description || null,
      category: form.category,
      condition: form.condition || null,
      type: form.type,
      price: form.price ? parseInt(form.price) : 0,
      location: form.location || null,
      images: imageUrls,
      files: fileUrls,
    });

    setLoading(false);

    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Resource uploaded! 🎉", description: "Your resource is now live on the marketplace." });
      navigate("/marketplace");
    }
  };

  return (
    <div className="min-h-screen pt-16 px-4 pb-8">
      <div className="container mx-auto max-w-2xl">
        <motion.h1
          className="font-heading text-3xl sm:text-4xl font-bold mb-2 pt-4"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        >
          Upload <span className="text-gradient">Resource</span>
        </motion.h1>
        <p className="text-muted-foreground mb-8">Share your academic resources with fellow students.</p>

        <form onSubmit={handleSubmit} className="space-y-6 bg-card rounded-2xl p-6 shadow-soft border border-border/50">
          {/* Images */}
          <div>
            <Label className="mb-2 block">Photos</Label>
            <div className="flex flex-wrap gap-3">
              {previews.map((img, i) => (
                <div key={i} className="relative h-24 w-24 rounded-xl overflow-hidden border border-border">
                  <img src={img} alt="" className="h-full w-full object-cover" />
                  <button type="button" className="absolute top-1 right-1 h-5 w-5 bg-destructive rounded-full flex items-center justify-center" onClick={() => removeImage(i)}>
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
              <label className="h-24 w-24 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center cursor-pointer text-muted-foreground hover:text-primary">
                <ImageIcon className="h-6 w-6 mb-1" />
                <span className="text-xs">Add</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          {/* Files (PDF/Notes) */}
          <div>
            <Label className="mb-2 block">PDFs / Notes / Documents</Label>
            <div className="space-y-2">
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-2">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm truncate flex-1">{file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                  <button type="button" onClick={() => removeFile(i)} className="text-destructive hover:text-destructive/80">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <label className="flex items-center gap-3 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors p-4 cursor-pointer text-muted-foreground hover:text-primary">
                <FileText className="h-6 w-6" />
                <div>
                  <p className="text-sm font-medium">Upload PDFs, notes, documents</p>
                  <p className="text-xs">PDF, DOC, DOCX, PPT, TXT supported</p>
                </div>
                <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.xlsx,.xls" multiple className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" placeholder="e.g., Calculus Textbook 8th Edition" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 rounded-xl" />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Describe the condition, edition, and any relevant details..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 rounded-xl min-h-[100px]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["Books", "Electronics", "Tools", "Study Materials", "Notes & PDFs"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condition</Label>
              <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["New", "Like New", "Good", "Fair", "Poor"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["Sell", "Exchange", "Share"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="price">Price (₹)</Label>
              <Input id="price" type="number" placeholder="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1 rounded-xl" />
            </div>
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" placeholder="e.g., Campus A, Library" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-1 rounded-xl" />
          </div>

          <Button type="submit" size="lg" className="w-full bg-gradient-primary font-semibold gap-2 text-white rounded-xl" disabled={loading}>
            <Upload className="h-4 w-4" /> {loading ? "Publishing..." : "Publish Resource"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default UploadResource;
