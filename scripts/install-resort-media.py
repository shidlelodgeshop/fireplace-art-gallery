#!/usr/bin/env python3
"""Install local media for the native Resort TV picker after installing its APK."""
import argparse, pathlib, subprocess
p=argparse.ArgumentParser();p.add_argument('--adb',default='adb');p.add_argument('--serial',required=True);a=p.parse_args()
repo=pathlib.Path(__file__).resolve().parent.parent
slugs=['old-key-west','contemporary','boardwalk','coronado-springs','port-orleans-french-quarter','animal-kingdom-lodge']
def adb(*args):subprocess.run([a.adb,'-s',a.serial,*args],check=True)
for slug in slugs:
 for name in ['background.png','music.mp3']:
  source=repo/'assets/resorts'/slug/name
  assert source.is_file() and source.stat().st_size>1000,source
  temp=f'/data/local/tmp/resort-{slug}-{name}'
  dest=f'files/resorts/{slug}'
  adb('push',str(source),temp)
  adb('shell','run-as','tv.fireplace.artidle','mkdir','-p',dest)
  adb('shell','run-as','tv.fireplace.artidle','cp',temp,f'{dest}/{name}.new')
  adb('shell','run-as','tv.fireplace.artidle','mv',f'{dest}/{name}.new',f'{dest}/{name}')
  adb('shell','rm',temp)
 print('Installed',slug,flush=True)
