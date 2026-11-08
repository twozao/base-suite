#!/usr/bin/env python3
# Generates the images used by the sample site profiles (logo mark, hero, social image, post covers
# and page figures) as SVG, then rasterises them with rsvg-convert into static/samples/<profile>/.
# Run: python3 scripts/sample_images.py   (needs rsvg-convert: brew install librsvg)
import os, subprocess, textwrap, math, html

ROOT = os.path.join(os.path.dirname(__file__), "..", "static", "samples")

PROFILES = {
    "enterprise": {
        "name": "Halden Systems",
        "tagline": "Automation and energy systems for the plants that keep the world running",
        "bg": "#13294b", "bg2": "#0b1a33", "fg": "#ffffff", "muted": "#9fb3d1",
        "primary": "#2f5e9e", "accent": "#c8102e", "font": "Helvetica Neue, Arial, sans-serif",
        "motif": "industrial", "paper": "#f3f5f8", "ink": "#111827",
        "covers": [
            ("predictive-maintenance-40-sites", "Three lessons from rolling out predictive maintenance across 40 sites", "Engineering"),
            ("pune-expansion", "Halden expands its Pune engineering centre", "Company news"),
            ("supplier-emissions", "How we audit supplier emissions, and why it took three years", "Sustainability"),
            ("q3-update", "Third quarter trading update", "Investors"),
            ("ot-security", "OT cyber security: what changed this year", "Engineering"),
            ("graduate-programme", "Graduate programme: applications open", "Careers"),
            ("nordfjord-story", "Customer story: Nordfjord Paper", "Customer stories"),
            ("safety-record", "A year without a lost-time incident on Halden sites", "Safety"),
        ],
        "figures": [
            ("engagement", "How an engagement runs", ["Site assessment", "Design and FAT", "Commissioning", "Service contract"]),
            ("stack", "Plant systems stack", ["Field devices", "Control and safety", "Plant data", "Energy and reporting"]),
            ("regions", "Where we work", ["Zurich", "Pune", "Monterrey", "Singapore"]),
        ],
    },
    "agency": {
        "name": "Northlane Studio",
        "tagline": "Websites that work and AI that actually helps",
        "bg": "#0b1020", "bg2": "#1a1340", "fg": "#ffffff", "muted": "#b7b3d6",
        "primary": "#8b5cf6", "accent": "#a3e635", "font": "Helvetica Neue, Arial, sans-serif",
        "motif": "studio", "paper": "#121a2e", "ink": "#e6eaf3",
        "covers": [
            ("ai-assistant", "What an AI assistant can actually do for a small business", "AI"),
            ("three-week-rebuild", "A website rebuild in three weeks: how we scope it", "Process"),
            ("chatbot-or-search", "Chatbot or search box? Pick the boring one first", "AI"),
            ("marina-physio", "Case study: Marina Physio", "Case study"),
            ("saying-no", "Why every project starts with saying no", "Process"),
            ("speed", "Why we obsess over page speed", "Websites"),
            ("own-your-site", "Own your website: domains, hosting and backups explained", "Guides"),
        ],
        "figures": [
            ("process", "How a project runs", ["One page brief", "Build in the open", "Launch", "Care plan"]),
            ("assistant", "How the assistant answers", ["Your documents", "Assistant", "Customer", "Hand-off to a person"]),
        ],
    },
    "portfolio": {
        "name": "John Doe",
        "tagline": "Product designer and front-end developer",
        "bg": "#f5f2ea", "bg2": "#ece7da", "fg": "#1c1917", "muted": "#78716c",
        "primary": "#1c1917", "accent": "#d97706", "font": "Georgia, 'Times New Roman', serif",
        "motif": "paper", "paper": "#fdfcf9", "ink": "#1c1917",
        "covers": [
            ("settings-page", "Notes on designing a settings page", "Design"),
            ("freelancing", "Four years of freelancing: what I would do differently", "Freelancing"),
            ("now-page", "Why I keep a now page", "Writing"),
            ("design-system-for-one", "Building a design system for one", "Design systems"),
            ("accessibility-checks", "The accessibility checks I run before every launch", "Accessibility"),
            ("forms", "Forms people finish", "Design"),
            ("design-in-code", "Designing in code, four years in", "Process"),
        ],
        "figures": [
            ("ledgerly", "Ledgerly: the core flow", ["Connect a bank", "Categorise", "Review", "File"]),
            ("fieldnote", "Fieldnote: one-handed forms", ["Big targets", "Offline first", "High contrast", "Resume later"]),
        ],
    },
}


def esc(s):
    return html.escape(s, quote=True)


def wrap(text, width):
    return textwrap.wrap(text, width)


def grid(w, h, color, step=60, opacity=0.12):
    out = [f'<g stroke="{color}" stroke-opacity="{opacity}" stroke-width="1">']
    for x in range(0, w + 1, step):
        out.append(f'<line x1="{x}" y1="0" x2="{x}" y2="{h}"/>')
    for y in range(0, h + 1, step):
        out.append(f'<line x1="0" y1="{y}" x2="{w}" y2="{y}"/>')
    out.append("</g>")
    return "".join(out)


def motif(p, w, h, seed=0):
    """Decorative shapes in the profile's visual language. seed varies the composition."""
    kind = p["motif"]
    a, pr, fg = p["accent"], p["primary"], p["fg"]
    r = lambda i: ((seed * 7919 + i * 104729) % 1000) / 1000
    out = []
    if kind == "industrial":
        out.append(grid(w, h, fg, 60, 0.08))
        base = h * 0.78
        x = w * 0.08
        i = 0
        while x < w * 0.95:
            bw = 90 + r(i) * 160
            bh = 80 + r(i + 3) * 220
            out.append(f'<rect x="{x:.0f}" y="{base - bh:.0f}" width="{bw:.0f}" height="{bh:.0f}" fill="{pr}" fill-opacity="{0.35 + r(i + 5) * 0.4:.2f}"/>')
            if r(i + 1) > 0.5:
                cx = x + bw * 0.3
                out.append(f'<rect x="{cx:.0f}" y="{base - bh - 90:.0f}" width="22" height="90" fill="{pr}" fill-opacity="0.8"/>')
            x += bw + 18
            i += 1
        out.append(f'<rect x="0" y="{base:.0f}" width="{w}" height="4" fill="{a}"/>')
        for k in range(3):
            cx, cy = w * (0.2 + 0.3 * k), h * (0.22 + r(k + 9) * 0.2)
            out.append(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{40 + r(k) * 50:.0f}" fill="none" stroke="{fg}" stroke-opacity="0.35" stroke-width="2"/>')
            out.append(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="6" fill="{a}"/>')
    elif kind == "studio":
        for k in range(4):
            cx, cy = w * r(k + 1), h * r(k + 2)
            rad = 180 + r(k + 4) * 260
            col = a if k % 2 else pr
            out.append(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{rad:.0f}" fill="{col}" fill-opacity="0.22"/>')
        out.append(grid(w, h, fg, 80, 0.06))
        bx, by, bw, bh = w * 0.55, h * 0.2, w * 0.38, h * 0.55
        out.append(f'<rect x="{bx:.0f}" y="{by:.0f}" width="{bw:.0f}" height="{bh:.0f}" rx="18" fill="{fg}" fill-opacity="0.06" stroke="{fg}" stroke-opacity="0.3"/>')
        out.append(f'<rect x="{bx:.0f}" y="{by:.0f}" width="{bw:.0f}" height="36" rx="18" fill="{fg}" fill-opacity="0.08"/>')
        for k in range(3):
            out.append(f'<circle cx="{bx + 22 + k * 18:.0f}" cy="{by + 18:.0f}" r="5" fill="{a if k == 2 else pr}"/>')
        for k in range(4):
            lw = bw * (0.4 + r(k + 7) * 0.45)
            out.append(f'<rect x="{bx + 28:.0f}" y="{by + 70 + k * 42:.0f}" width="{lw:.0f}" height="16" rx="8" fill="{fg}" fill-opacity="0.18"/>')
        out.append(f'<rect x="{bx + 28:.0f}" y="{by + bh - 70:.0f}" width="150" height="40" rx="20" fill="{pr}"/>')
    else:  # paper
        out.append(f'<rect x="0" y="0" width="{w}" height="{h}" fill="url(#paperdots)"/>')
        for k in range(3):
            y = h * (0.3 + r(k + 2) * 0.5)
            out.append(f'<path d="M{w * 0.05:.0f} {y:.0f} C {w * 0.3:.0f} {y - 80 - r(k) * 120:.0f}, {w * 0.6:.0f} {y + 60 + r(k + 1) * 100:.0f}, {w * 0.95:.0f} {y - 20:.0f}" fill="none" stroke="{fg}" stroke-opacity="{0.18 + k * 0.1:.2f}" stroke-width="{2 + k:.0f}"/>')
        out.append(f'<circle cx="{w * 0.8:.0f}" cy="{h * 0.3:.0f}" r="{min(w, h) * 0.12:.0f}" fill="{a}" fill-opacity="0.85"/>')
    return "".join(out)


def defs(p):
    return (
        f'<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0" stop-color="{p["bg"]}"/><stop offset="1" stop-color="{p["bg2"]}"/></linearGradient>'
        f'<pattern id="paperdots" width="24" height="24" patternUnits="userSpaceOnUse">'
        f'<circle cx="2" cy="2" r="1" fill="{p["fg"]}" fill-opacity="0.12"/></pattern></defs>'
    )


def svg(w, h, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>'


def text_block(p, lines, x, y, size, weight="700", color=None, anchor="start", lh=1.15):
    color = color or p["fg"]
    out = []
    for i, line in enumerate(lines):
        out.append(f'<text x="{x}" y="{y + i * size * lh:.0f}" font-family="{p["font"]}" font-size="{size}" font-weight="{weight}" fill="{color}" text-anchor="{anchor}">{esc(line)}</text>')
    return "".join(out)


def logo(p):
    w = h = 128
    initial = p["name"][0]
    body = defs(p) + f'<rect width="{w}" height="{h}" rx="28" fill="{p["primary"] if p["motif"] != "paper" else p["ink"]}"/>'
    body += f'<rect x="18" y="92" width="92" height="8" rx="4" fill="{p["accent"]}"/>'
    body += f'<text x="64" y="80" font-family="{p["font"]}" font-size="68" font-weight="700" fill="#ffffff" text-anchor="middle">{esc(initial)}</text>'
    return svg(w, h, body)


def hero(p):
    w, h = 1200, 800
    body = defs(p) + f'<rect width="{w}" height="{h}" fill="url(#bg)"/>' + motif(p, w, h, 1)
    return svg(w, h, body)


def og(p):
    w, h = 1200, 630
    body = defs(p) + f'<rect width="{w}" height="{h}" fill="url(#bg)"/>' + motif(p, w, h, 2)
    body += f'<rect x="0" y="0" width="{w}" height="{h}" fill="{p["bg"]}" fill-opacity="0.55"/>'
    body += text_block(p, [p["name"]], 80, 300, 72)
    body += text_block(p, wrap(p["tagline"], 48), 80, 370, 34, "400", p["muted"])
    return svg(w, h, body)


def cover(p, i, title, tag):
    w, h = 1200, 675
    body = defs(p) + f'<rect width="{w}" height="{h}" fill="url(#bg)"/>' + motif(p, w, h, 10 + i)
    body += f'<rect x="0" y="0" width="{w}" height="{h}" fill="{p["bg"]}" fill-opacity="0.5"/>'
    body += f'<rect x="80" y="110" width="{len(tag) * 16 + 40}" height="44" rx="22" fill="{p["accent"]}"/>'
    body += text_block(p, [tag.upper()], 100, 139, 20, "700", "#ffffff" if p["motif"] != "paper" else "#ffffff")
    lines = wrap(title, 30)[:4]
    body += text_block(p, lines, 80, 250, 56)
    body += text_block(p, [p["name"]], 80, h - 70, 26, "400", p["muted"])
    return svg(w, h, body)


def figure(p, title, steps):
    """A simple left-to-right step diagram on the profile's light surface, for use inside pages."""
    w, h = 1200, 480
    paper, ink, a, pr = p["paper"], p["ink"], p["accent"], p["primary"]
    body = f'<rect width="{w}" height="{h}" rx="24" fill="{paper}"/>'
    body += text_block(p, [title], 60, 80, 34, "700", ink)
    n = len(steps)
    bw = (w - 120 - (n - 1) * 40) / n
    for k, s in enumerate(steps):
        x = 60 + k * (bw + 40)
        y = 170
        body += f'<rect x="{x:.0f}" y="{y}" width="{bw:.0f}" height="200" rx="16" fill="{pr}" fill-opacity="0.1" stroke="{pr}" stroke-opacity="0.5"/>'
        body += f'<circle cx="{x + 36:.0f}" cy="{y + 40}" r="20" fill="{a}"/>'
        body += f'<text x="{x + 36:.0f}" y="{y + 47}" font-family="{p["font"]}" font-size="20" font-weight="700" fill="#ffffff" text-anchor="middle">{k + 1}</text>'
        body += text_block(p, wrap(s, max(10, int(bw / 15))), x + 20, y + 110, 24, "700", ink)
        if k < n - 1:
            ax = x + bw + 4
            body += f'<path d="M{ax:.0f} 270 h26 m-8 -8 l8 8 -8 8" fill="none" stroke="{ink}" stroke-opacity="0.6" stroke-width="3" stroke-linecap="round"/>'
    return svg(w, h, body)


def write(path, content, png_w=None):
    svg_path = path + ".svg"
    with open(svg_path, "w") as f:
        f.write(content)
    args = ["rsvg-convert", svg_path, "-o", path + ".png"]
    if png_w:
        args += ["-w", str(png_w)]
    subprocess.run(args, check=True)
    os.remove(svg_path)


def main():
    for pid, p in PROFILES.items():
        d = os.path.join(ROOT, pid)
        os.makedirs(d, exist_ok=True)
        write(os.path.join(d, "logo"), logo(p))
        write(os.path.join(d, "hero"), hero(p))
        write(os.path.join(d, "og"), og(p))
        for i, (slug, title, tag) in enumerate(p["covers"]):
            write(os.path.join(d, f"cover-{slug}"), cover(p, i, title, tag))
        for slug, title, steps in p["figures"]:
            write(os.path.join(d, f"figure-{slug}"), figure(p, title, steps))
        print(pid, "done")


if __name__ == "__main__":
    main()
