from pathlib import Path
import re, shutil
source = Path('node_modules/@fontsource-variable/inter')
target = Path('src/assets/fonts')
css = source.joinpath('wght.css').read_text()
blocks = re.findall(r'@font-face \{.*?\}', css, re.S)
blocks = [b for b in blocks if re.search(r'inter-latin(?:-ext)?-wght-normal', b)]
assert len(blocks) == 2
for subset in ['latin', 'latin-ext']:
 name = f'inter-{subset}-wght-normal.woff2'
 shutil.copyfile(source / 'files' / name, target / name)
shutil.copyfile(source / 'LICENSE', target / 'inter-LICENSE.txt')
Path('src/styles/fonts.css').write_text('/* OFL Inter subsets; regenerate with scripts/optimize-fonts.py. */\n' + '\n'.join(blocks).replace("'Inter Variable'", "'Inter'").replace('./files/', '../assets/fonts/'))
