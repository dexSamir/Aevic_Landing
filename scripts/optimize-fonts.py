from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont
from pathlib import Path
from hashlib import sha256
from urllib.request import urlopen
import argparse

# Offline output is checked in; this maintenance tool is NOT part of the app build.
# Reproduce with Python + fonttools[woff]==4.66.1 (Brotli 1.2.0).
# Retain the complete cmap and GSUB feature union of the locked Fontsource subsets,
# including extended Latin, Azerbaijani, punctuation and symbols—not page strings.
REVISION = '0502fee975d3237bc9fa43b4b221c4e01bfdb054'
HASHES = {
 'raleway': '8bbcc3eb8275c388f4bcd998832f8a4b943eadbaf6a595205312774b5951aefb',
 'oswald': '5b38c246e255a12f5712d640d56bcced0472466fc68983d2d0410ec0457c2817',
 'orbitron': 'f42db2dd16e642258e35782916eceb1dcdbea06fb958d77ad71dc5963587e8fd',
}
parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', type=Path, help='Optional cache containing aevic-<family>.ttf')
args = parser.parse_args()
OUTPUT = Path('src/assets/fonts')
OUTPUT.mkdir(parents=True, exist_ok=True)

def source_font(family):
 url = f'https://raw.githubusercontent.com/google/fonts/{REVISION}/ofl/{family}/{family.title()}%5Bwght%5D.ttf'
 data = (args.source_dir / f'aevic-{family}.ttf').read_bytes() if args.source_dir else urlopen(url, timeout=30).read()
 assert sha256(data).hexdigest() == HASHES[family], 'Unexpected upstream font'
 from io import BytesIO
 return TTFont(BytesIO(data))
for family in ['raleway','oswald','orbitron']:
 font=source_font(family)
 pattern=family+'-latin*-'+('wght' if family=='raleway' else '700')+'-normal.woff2'
 sources=list(Path('node_modules').glob('@fontsource*/'+family+'/files/'+pattern))
 coverage=set().union(*(TTFont(p).getBestCmap().keys() for p in sources))
 assert coverage <= font.getBestCmap().keys(), (family,coverage-font.getBestCmap().keys())
 options=subset.Options();options.layout_features=sorted({r.FeatureTag for p in sources for r in TTFont(p)['GSUB'].table.FeatureList.FeatureRecord});options.name_IDs=[0,1,2,3,4,5,6,13,14,16,17,25]
 sub=subset.Subsetter(options=options);sub.populate(unicodes=coverage);sub.subset(font)
 if family=='oswald':font=instantiateVariableFont(font,{'wght':700},inplace=True)
 if family=='orbitron':font=instantiateVariableFont(font,{'wght':(600,800)},inplace=True)
 # Modified OFL fonts receive distinct internal names; CSS aliases retain the design's family tokens.
 name={'raleway':'Aevic UI','oswald':'Aevic Display','orbitron':'Aevic Competition'}[family]
 for record in font['name'].names:
  if record.nameID not in [0,13,14]:
   value=record.toUnicode().replace(family.title(),name).replace(name+'-',name.replace(' ','')+'-')
   if record.nameID==6:value=value.replace(' ','')
   record.string=value.encode(record.getEncoding())
 font.recalcTimestamp=False
 font.flavor='woff2';out=Path('src/assets/fonts')/(family+'-aevic.woff2');font.save(out)
 assert set(TTFont(out).getBestCmap()) == coverage
 if family != 'orbitron':
  assert set(map(ord, 'əƏıİşŞçÇğĞöÖüÜ')) <= coverage
 license_source = sources[0].parent.parent / 'LICENSE'
 (OUTPUT / (family + '-LICENSE.txt')).write_bytes(license_source.read_bytes())
 print(family,len(coverage),out.stat().st_size)

# Advertise actual coverage precisely, leaving other scripts to the existing fallbacks.
css = '/* Static OFL subsets: regenerate with scripts/optimize-fonts.py. */\n'
for family, weight in [('raleway', '100 900'), ('oswald', '700'), ('orbitron', '600 800')]:
 points = sorted(TTFont(OUTPUT / (family + '-aevic.woff2')).getBestCmap())
 ranges = []
 start = end = points[0]
 for cp in points[1:]:
  if cp == end + 1: end = cp
  else: ranges.append((start, end)); start = end = cp
 ranges.append((start, end))
 unicode = ','.join(f'U+{a:04X}' + (f'-{b:04X}' if b != a else '') for a, b in ranges)
 css += f"@font-face {{\n  font-family: '{family.title()}';\n  font-style: normal;\n  font-display: swap;\n  font-weight: {weight};\n  src: url('../assets/fonts/{family}-aevic.woff2') format('woff2');\n  unicode-range: {unicode};\n}}\n"
Path('src/styles/fonts.css').write_text(css)
