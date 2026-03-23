import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const UploadResource = () => {
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({ title: "", description: "", category: "", condition: "", type: "", price: "" });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.category || !form.type) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    toast({ title: "Resource uploaded!", description: "Your resource has been listed on the marketplace." });
    setForm({ title: "", description: "", category: "", condition: "", type: "", price: "" });
    setImages([]);
  };

  return (
    <div className="min-h-screen pt-20 px-4">
      <div className="container mx-auto max-w-2xl">
        <motion.h1
          className="font-heading text-3xl sm:text-4xl font-bold mb-2"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        >
          Upload <span className="text-gradient">Resource</span>
        </motion.h1>
        <p className="text-muted-foreground mb-8">Share your academic resources with fellow students.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Images */}
          <div>
            <Label className="mb-2 block">Photos</Label>
            <div className="flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative h-24 w-24 rounded-lg overflow-hidden border border-border">
                  <img src={img} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute top-1 right-1 h-5 w-5 bg-destructive rounded-full flex items-center justify-center"
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <X className="h-3 w-3 text-destructive-foreground" />
                  </button>
                </div>
              ))}
              <label className="h-24 w-24 rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center cursor-pointer text-muted-foreground hover:text-primary">
                <ImageIcon className="h-6 w-6 mb-1" />
                <span className="text-xs">Add</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" placeholder="e.g., Calculus Textbook 8th Edition" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 bg-card" />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Describe the condition, edition, and any relevant details..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 bg-card min-h-[100px]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1 bg-card"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["Books", "Electronics", "Tools", "Study Materials"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condition</Label>
              <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                <SelectTrigger className="mt-1 bg-card"><SelectValue placeholder="Select" /></SelectTrigger>
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
                <SelectTrigger className="mt-1 bg-card"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["Sell", "Exchange", "Share"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="price">Price ($)</Label>
              <Input id="price" type="number" placeholder="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1 bg-card" />
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full bg-gradient-primary font-semibold gap-2">
            <Upload className="h-4 w-4" /> Publish Resource
          </Button>
        </form>
      </div>
    </div>
  );
};

export default UploadResource;
