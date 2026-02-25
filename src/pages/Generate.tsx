import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { DNAGuard } from "@/components/DNAGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Image as ImageIcon } from "lucide-react";

const PRODUCT_TYPES = [
  "Adult Tee", "Adult Hoodie", "Kid Tee", "Kid Hoodie", "Kids AOP",
];

const PRINT_TYPES = [
  "Chest Print", "Puff Chest", "Embroidery ton-sur-ton", "Seamless AOP",
];

const Generate = () => {
  const [mode, setMode] = useState<"quiet" | "funny">("quiet");
  const [productType, setProductType] = useState("");
  const [printType, setPrintType] = useState("");
  const [prompt, setPrompt] = useState("");
  const [negativeSpace, setNegativeSpace] = useState([70]);
  const [styleStrength, setStyleStrength] = useState([50]);
  const [paletteLocked, setPaletteLocked] = useState(true);
  const [seed, setSeed] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Mock generation delay
    setTimeout(() => {
      setIsGenerating(false);
    }, 3000);
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
            AI Design Generator
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-body">
            Create brand-aligned designs with DNA validation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mode Selector */}
            <Card className="border-border">
              <CardContent className="p-5">
                <Label className="text-xs font-body uppercase tracking-wider text-muted-foreground mb-3 block">
                  Brand Mode
                </Label>
                <div className="flex gap-3">
                  {(["quiet", "funny"] as const).map((m) => (
                    <Button
                      key={m}
                      variant={mode === m ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMode(m)}
                      className="flex-1 font-body text-xs tracking-wider uppercase"
                    >
                      {m === "quiet" ? "Quiet Luxury" : "Funny Premium"}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Product & Print Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border">
                <CardContent className="p-5">
                  <Label className="text-xs font-body uppercase tracking-wider text-muted-foreground mb-3 block">
                    Product Type
                  </Label>
                  <Select value={productType} onValueChange={setProductType}>
                    <SelectTrigger className="font-body">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="font-body">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-5">
                  <Label className="text-xs font-body uppercase tracking-wider text-muted-foreground mb-3 block">
                    Print Type
                  </Label>
                  <Select value={printType} onValueChange={setPrintType}>
                    <SelectTrigger className="font-body">
                      <SelectValue placeholder="Select print" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRINT_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="font-body">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>

            {/* Prompt */}
            <Card className="border-border">
              <CardContent className="p-5">
                <Label className="text-xs font-body uppercase tracking-wider text-muted-foreground mb-3 block">
                  Design Prompt (French)
                </Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Décrivez votre design avec élégance..."
                  className="min-h-[100px] font-body resize-none"
                />
              </CardContent>
            </Card>

            {/* Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-xs font-body uppercase tracking-wider text-muted-foreground">
                      Negative Space
                    </Label>
                    <span className="text-xs font-body text-foreground font-medium">{negativeSpace[0]}%</span>
                  </div>
                  <Slider
                    value={negativeSpace}
                    onValueChange={setNegativeSpace}
                    min={30}
                    max={90}
                    step={5}
                  />
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-xs font-body uppercase tracking-wider text-muted-foreground">
                      Style Strength
                    </Label>
                    <span className="text-xs font-body text-foreground font-medium">{styleStrength[0]}%</span>
                  </div>
                  <Slider
                    value={styleStrength}
                    onValueChange={setStyleStrength}
                    min={10}
                    max={100}
                    step={5}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Switch checked={paletteLocked} onCheckedChange={setPaletteLocked} />
                <Label className="text-xs font-body text-muted-foreground">Palette Lock</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-body text-muted-foreground">Seed</Label>
                <Input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Random"
                  className="w-24 font-body text-sm"
                />
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full font-body text-xs tracking-wider uppercase h-12"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Design
                </>
              )}
            </Button>
          </div>

          {/* Right: DNA Guard + Preview */}
          <div className="space-y-6">
            <DNAGuard prompt={prompt} mode={mode} />

            {/* Preview area */}
            <Card className="border-border border-dashed">
              <CardContent className="p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
                <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-xs text-muted-foreground font-body">
                  Preview will appear here
                </p>
                <p className="text-[10px] text-muted-foreground font-body mt-1">
                  4500 × 5400px · PNG · Transparent
                </p>
              </CardContent>
            </Card>

            {/* Palette Preview */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-body font-medium">Brand Palette</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {[
                    { name: "Sable", className: "bg-sable" },
                    { name: "Brume", className: "bg-brume" },
                    { name: "Navy", className: "bg-navy" },
                    { name: "Crème", className: "bg-creme" },
                    { name: "Lavande", className: "bg-lavande" },
                  ].map((c) => (
                    <div key={c.name} className="flex-1 text-center">
                      <div className={`h-8 rounded-sm ${c.className} border border-border`} />
                      <p className="text-[9px] text-muted-foreground font-body mt-1">{c.name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Generate;
