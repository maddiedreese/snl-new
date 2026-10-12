"""Build Studio Marker from the checked-in hand-lettering outlines.

Development only: pip install fonttools shapely brotli
The checked-in WOFF2 is sufficient for normal site builds.
"""
from pathlib import Path
import math
import json
import unicodedata
from fontTools.fontBuilder import FontBuilder
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.pens.basePen import BasePen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.svgLib.path import parse_path
from shapely.geometry import Polygon, MultiPoint
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

# Hand-drawn centerlines in a 700-unit cap-height coordinate system.
# The sloping crossbars and asymmetric bowls are intentional.
STROKES = {
 'A': 'M45 695 Q114 358 226 22 Q264 268 350 684 M92 450 L342 409',
 'B': 'M73 680 Q55 381 74 39 M55 60 C455 -85 393 253 83 331 C430 212 483 605 79 681',
 'C': 'M360 105 C250 -70 75 16 53 332 C25 617 163 801 346 583',
 'D': 'M64 686 L70 41 M53 53 C469 -88 483 612 72 674',
 'E': 'M353 19 L66 87 L63 687 Q188 681 338 621 M71 367 L284 308',
 'F': 'M55 686 L69 73 L365 14 M72 363 L298 308',
 'G': 'M371 114 C216 -88 51 78 43 368 C37 657 223 797 371 591 L352 368 L226 409',
 'H': 'M63 15 Q87 335 52 695 M364 27 L352 677 M65 359 L359 305',
 'I': 'M103 28 Q128 362 96 687',
 'J': 'M22 106 L378 3 M270 51 Q323 483 248 645 C174 758 40 680 37 576',
 'K': 'M59 28 L71 687 M360 16 L70 373 L370 680',
 'L': 'M60 16 Q101 387 68 684 L346 621',
 'M': 'M45 690 L81 30 L250 432 L393 14 L449 685',
 'N': 'M59 693 L66 27 Q202 309 346 652 L341 19',
 'O': 'M221 18 C36 -32 12 232 50 490 C77 737 286 789 356 547 C426 327 368 5 221 18 Z',
 'P': 'M64 696 L71 53 C388 -66 466 259 75 349',
 'Q': 'M220 21 C30 -31 11 283 49 505 C83 745 291 755 357 505 C412 291 365 5 220 21 Z M241 537 L409 732',
 'R': 'M61 691 L68 56 C395 -65 438 253 74 353 M132 352 Q270 539 382 683',
 'S': 'M344 96 C162 -97 25 43 101 248 C166 397 394 440 334 601 C273 766 57 705 38 586',
 'T': 'M20 109 L421 0 M228 62 Q251 371 228 687',
 'U': 'M63 26 L57 489 C46 788 355 761 358 476 L364 14',
 'V': 'M47 22 Q129 392 202 698 L385 12',
 'W': 'M42 16 L144 685 L286 263 L371 678 L481 12',
 'X': 'M39 26 Q200 296 366 690 M345 18 L37 685',
 'Y': 'M35 23 L214 363 L391 7 M213 359 L214 690',
 'Z': 'M39 101 L371 21 L48 675 L381 621',
 '0': 'M205 24 C32 9 14 271 44 495 C75 753 329 738 354 452 C383 213 337 4 205 24 Z',
 '1': 'M51 160 L200 33 L180 686',
 '2': 'M38 154 C101 -68 382 -15 337 187 C297 375 126 535 41 681 L363 646',
 '3': 'M36 149 C109 -25 365 -36 322 171 Q292 275 156 326 C391 238 418 443 324 591 Q210 748 42 671',
 '4': 'M288 20 L41 435 L373 400 M288 20 L270 689',
 '5': 'M361 23 L80 54 L71 321 C341 183 456 494 287 647 Q186 735 41 644',
 '6': 'M305 30 C132 -30 21 322 49 529 C80 789 363 724 359 475 C352 299 133 299 53 478',
 '7': 'M29 63 L381 23 Q251 297 158 688',
 '8': 'M188 330 C-65 182 74 -39 252 30 C479 135 261 340 188 330 C-70 440 28 746 229 693 C451 619 391 437 188 330 Z',
 '9': 'M333 231 C344 -37 50 -52 40 195 C23 430 242 423 339 208 Q347 491 112 686',
 '&': 'M369 334 Q218 716 85 676 C-53 634 23 446 160 326 C449 77 160 -98 99 82 C43 253 237 522 415 694',
 "'": 'M68 7 L47 114',
 '.': 'M44 662 L55 670',
 ',': 'M78 650 L45 765',
 '!': 'M80 23 L66 516 M60 662 L63 672',
 '?': 'M37 107 C135 -46 344 27 288 214 Q249 299 151 341 L142 487 M139 667 L145 672',
 '-': 'M27 368 L248 336',
 '+': 'M29 350 L308 333 M166 178 L164 519',
 '/': 'M30 715 L308 3',
 ':': 'M67 279 L70 284 M60 637 L65 643',
 ';': 'M68 280 L70 286 M80 641 L49 741',
 '(': 'M186 5 Q-3 337 173 700',
 ')': 'M39 4 Q246 344 49 704',
 '#': 'M124 67 L77 650 M291 47 L242 632 M27 279 L350 241 M13 478 L337 441',
 '$': 'M344 96 C162 -97 25 43 101 248 C166 397 394 440 334 601 C273 766 57 705 38 586 M209 -51 L188 767',
 '%': 'M21 683 L393 13 M127 34 C19 11 4 221 115 238 C219 245 218 45 127 34 Z M301 447 C190 429 182 652 291 668 C406 678 408 466 301 447 Z',
 '@': 'M422 600 C41 830 -57 323 123 103 C315 -123 639 215 435 452 C335 558 309 444 341 258 C229 138 122 436 245 472 Q300 484 340 299',
 '"': 'M51 10 L43 120 M161 4 L150 113',
 '=': 'M30 270 L293 244 M28 462 L292 433',
 '*': 'M144 44 L158 311 M32 103 L278 244 M31 260 L280 93',
 '_': 'M28 747 L318 728',
 '[': 'M205 7 L64 24 L56 709 L209 689',
 ']': 'M31 8 L181 21 L176 702 L34 699',
 '<': 'M290 121 L33 340 L282 543',
 '>': 'M34 120 L291 336 L41 548',
 '|': 'M65 -15 L58 737',
 '\\': 'M33 8 L305 706',
 '^': 'M24 186 L144 13 L264 174',
 '~': 'M32 349 C116 181 196 440 286 285',
 '`': 'M42 4 L130 112',
 '{': 'M229 -12 Q55 -14 104 227 Q140 327 22 356 Q136 341 100 469 Q34 717 220 722',
 '}': 'M24 -12 Q198 -14 149 227 Q113 327 231 356 Q117 341 153 469 Q219 717 33 722',
}

class FlatPen(BasePen):
    def __init__(self):
        super().__init__(None)
        self.paths = []
    def _moveTo(self, p):
        self.paths.append([p])
    def _lineTo(self, p):
        self.paths[-1].append(p)
    def _curveToOne(self, p1, p2, p3):
        p0 = self.paths[-1][-1]
        for i in range(1, 25):
            t = i/24
            self._lineTo(tuple((1-t)**3*p0[j] + 3*(1-t)**2*t*p1[j] + 3*(1-t)*t*t*p2[j] + t**3*p3[j] for j in (0,1)))
    def _qCurveToOne(self, p1, p2):
        p0 = self.paths[-1][-1]
        for i in range(1, 19):
            t = i/18
            self._lineTo(tuple((1-t)**2*p0[j] + 2*(1-t)*t*p1[j] + t*t*p2[j] for j in (0,1)))
    def _closePath(self):
        self.paths[-1].append(self.paths[-1][0])
    def _endPath(self):
        pass

def outline(d):
    pen = FlatPen()
    parse_path(d, pen)
    polygons = []
    for si, points in enumerate(pen.paths):
        prev = None
        for i, (x,y) in enumerate(points):
            # A broad, slanted chisel tip: thick stems, thin rising crossbars.
            pressure = 0.96 + .065*math.sin(i*.57+si*2.4)
            tip = []
            for a in range(12):
                angle = a*math.pi/6
                u, v = 51*math.cos(angle)*pressure, 19*math.sin(angle)*pressure
                tip.append((x + u*.94 + v*.34, y - u*.34 + v*.94))
            polygons.append(Polygon(tip))
            if prev:
                polygons.append(MultiPoint(prev+tip).convex_hull)
            prev = tip
    return unary_union(polygons).simplify(.65, preserve_topology=True)

def glyph(shape, dx=0):
    pen = TTGlyphPen(None)
    for polygon in getattr(shape, 'geoms', [shape]):
        polygon = orient(polygon, sign=1)
        for ring in [polygon.exterior, *polygon.interiors]:
            points = [(round(x+dx), round(740-y)) for x,y in list(ring.coords)[:-1]]
            pen.moveTo(points[0])
            for p in points[1:]: pen.lineTo(p)
            pen.closePath()
    return pen.glyph()

root = Path(__file__).resolve().parents[1]
font = FontBuilder(1000, isTTF=True)
glyphs = {'.notdef': TTGlyphPen(None).glyph(), 'space': TTGlyphPen(None).glyph()}
metrics = {'.notdef': (400,0), 'space': (170,0)}
cmap = {32: 'space', 160:'space'}
shapes = {}
for char, d in STROKES.items():
    shape = outline(d)
    shapes[char] = shape
    name = f'uni{ord(char):04X}'
    left,_,right,_ = shape.bounds
    dx = 18-left
    glyphs[name] = glyph(shape, dx)
    metrics[name] = (round(right-left+38),18)
    cmap[ord(char)] = name
    if char.isalpha(): cmap[ord(char.lower())] = name

# Latin diacritics are original marks, combined with the original capitals.
accents = {
 '\u0301':'M150 -73 L240 -170', '\u0300':'M145 -167 L227 -72',
 '\u0302':'M85 -73 L181 -160 L270 -80', '\u0303':'M68 -96 C133 -207 211 -13 290 -131',
 '\u0308':'M98 -111 L106 -113 M253 -111 L261 -113',
 '\u030a':'M175 -192 C61 -198 67 -56 179 -55 C285 -64 286 -194 175 -192 Z',
 '\u0327':'M204 745 Q349 917 144 883', '\u0304':'M82 -101 L278 -109',
 '\u030c':'M92 -168 L178 -78 L275 -169',
}
for cp in range(0xc0,0x180):
    decomp = unicodedata.normalize('NFD', chr(cp).upper())
    if len(decomp)==2 and decomp[0] in shapes and decomp[1] in accents:
        shape = unary_union([shapes[decomp[0]], outline(accents[decomp[1]])])
        name=f'uni{cp:04X}'
        left,_,right,_=shape.bounds
        glyphs[name]=glyph(shape,18-left)
        metrics[name]=(round(right-left+38),18)
        cmap[cp]=name
for cp, base in {0x2018:"'",0x2019:"'",0x201c:'"',0x201d:'"',0x2013:'-',0x2014:'-',0x2026:'.'}.items():
    cmap[cp]=cmap[ord(base)]

# Reference-informed uppercase outlines. The supplied points retain the writer's
# asymmetric ink shapes. Clean tracing noise before constructing smooth curves.
letterforms=json.loads((root/'scripts/letterforms.json').read_text())
cap_heights={'A':710,'E':675,'L':675,'N':725,'J':735,'T':740,'Y':735,'O':705,'S':685,'F':710,'D':705}
def clean_contours(contours):
    # The reference is a small raster image. Its pixel steps, pinholes and
    # one-pixel notches are sampling artifacts, not intentional pen texture.
    shape = Polygon(contours[0], [ring for ring in contours[1:]
                    if abs(Polygon(ring).area) > 900]).buffer(0)
    shape = shape.buffer(12, join_style=1).buffer(-12, join_style=1)
    shape = shape.buffer(-6, join_style=1).buffer(6, join_style=1)
    shape = shape.simplify(7, preserve_topology=True)
    result = []
    for polygon in getattr(shape, 'geoms', [shape]):
        polygon = orient(polygon, sign=1)
        result.extend([list(ring.coords)[:-1] for ring in
                       [polygon.exterior, *polygon.interiors]])
    return result


def draw_contours(pen, contours, scale=1, dy=0):
    for outline in clean_contours(contours):
        points=[(x,y*scale+dy) for x,y in outline]
        pen.moveTo(((points[-1][0]+points[0][0])/2,(points[-1][1]+points[0][1])/2))
        for i,p in enumerate(points):
            nxt=points[(i+1)%len(points)]
            pen.qCurveTo(p,((p[0]+nxt[0])/2,(p[1]+nxt[1])/2))
        pen.closePath()
for char,data in letterforms.items():
    pen=TTGlyphPen(None)
    draw_contours(pen,data['contours'],cap_heights.get(char,700)/700)
    name=cmap[ord(char)]
    glyphs[name]=pen.glyph()
    metrics[name]=(data['advance']+3,12)
    for cp in range(0xc0,0x180):
        decomp=unicodedata.normalize('NFD',chr(cp).upper())
        if len(decomp)==2 and decomp[0]==char and decomp[1] in accents and cp in cmap:
            composite=TTGlyphPen(None)
            draw_contours(composite,data['contours'],cap_heights.get(char,700)/700)
            accent=outline(accents[decomp[1]])
            # Align the accent over the actual letter, not over a fixed-width box.
            amin,_,amax,_=accent.bounds
            glyph(accent,(data['advance']-(amax+amin))/2).draw(composite,None)
            glyphs[cmap[cp]]=composite.glyph()
            metrics[cmap[cp]]=(data['advance']+3,12)
font.setupGlyphOrder(list(glyphs))
font.setupCharacterMap(cmap)
font.setupGlyf(glyphs)
font.setupHorizontalMetrics(metrics)
font.setupHorizontalHeader(ascent=950, descent=-240)
font.setupOS2(sTypoAscender=950, sTypoDescender=-240, usWinAscent=960, usWinDescent=240, sCapHeight=740, sxHeight=740)
font.setupNameTable({'familyName':'Studio Marker', 'styleName':'Regular', 'uniqueFontIdentifier':'StudioMarker-3.1', 'fullName':'Studio Marker Regular', 'psName':'StudioMarker-Regular', 'version':'Version 3.1', 'copyright':'Custom font software for snl-new. Lettering study based on announcement-card references; not an official NBC font.'})
font.setupPost()
font.setupMaxp()
# Optical pairs follow the narrow, interlocking spacing on the reference cards.
# Moderate pair adjustments keep the hooked crossbars visible rather than
# merging them into adjacent stems at normal preview size.
kern = {'DA':-75, 'AK':-75, 'KA':-70, 'KO':-85, 'OT':-120,
        'TA':-145, 'AT':-95, 'AY':-110, 'YA':-90, 'YO':-100,
        'JO':-95, 'OH':-40, 'HN':-45, 'NS':-45, 'SO':-70,
        'ON':-45, 'TU':-125, 'UR':-45, 'RN':-65, 'ST':-95,
        'TI':-90, 'IL':-35, 'LE':-55, 'OC':-65, 'CT':-85,
        'ED':-45, 'DE':-60, 'EB':-45, 'BI':-40, 'IR':-35,
        'RI':-50, 'HO':-45, 'OZ':-45, 'ZI':-45, 'IE':-40,
        'ER':-50, 'GR':-70, 'RA':-70, 'AC':-60, 'CI':-45,
        'BR':-60, 'RU':-70, 'UN':-55, 'SE':-55, 'EY':-80}
rules = [f"pos {cmap[ord(a)]} {cmap[ord(b)]} {round(amount * .4)};" for (a,b),amount in kern.items()]
addOpenTypeFeaturesFromString(font.font, 'feature kern { '+ ' '.join(rules) +' } kern;')
out=root/'public/fonts' 
out.mkdir(parents=True,exist_ok=True)
font.save(out/'StudioMarker-Regular.ttf')
font.font.flavor='woff2'
font.save(out/'studio-marker.woff2')
print(f'Built {len(glyphs)} glyphs; {len(cmap)} mapped characters.')
