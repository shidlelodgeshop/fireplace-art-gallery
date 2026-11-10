#!/usr/bin/env python3
"""Preload native Resort TV media. Install the matching APK first; existing files are retained."""
import argparse,pathlib,subprocess,json,hashlib,tempfile
p=argparse.ArgumentParser();p.add_argument('--adb',default='adb');p.add_argument('--serial',required=True);p.add_argument('--audio-cache',type=pathlib.Path,help='Optional <resort>/music.m4a cache for efficient AAC playback');a=p.parse_args()
repo=pathlib.Path(__file__).resolve().parent.parent;catalog=json.loads((repo/'assets/resorts/channel-catalog.json').read_text());pkg='tv.fireplace.artidle'
def adb(*args):return subprocess.check_output([a.adb,'-s',a.serial,*args],text=True)
def install(source,remote):
 assert source.is_file(),source
 temporary='/data/local/tmp/resort-media-stage';adb('push',str(source),temporary);adb('shell','run-as',pkg,'mkdir','-p',remote.rsplit('/',1)[0]);adb('shell','run-as',pkg,'cp',temporary,remote+'.new');adb('shell','run-as',pkg,'mv',remote+'.new',remote);adb('shell','rm',temporary)
 assert adb('shell','run-as',pkg,'sha256sum',remote).split()[0]==hashlib.sha256(source.read_bytes()).hexdigest(),remote
for resort in catalog['resorts']:
 slug=resort['id'];d=repo/'assets/resorts'/slug
 if slug!='saratoga':
  cached=a.audio_cache/slug/'music.m4a' if a.audio_cache else None
  audio=cached if cached and cached.is_file() else d/'music.mp3';install(audio,f'files/resorts/{slug}/{audio.name}')
 for kind,v in resort['variants'].items():
  if v['status']!='ready':continue
  for filename in ['source.png','animation.mp4','motion.json','background.png']:
   source=d/kind/filename
   if source.is_file():install(source,f'files/resorts/{slug}/{kind}/{filename}')
 print('Verified',slug,flush=True)

park=repo/'assets/parks-and-more/music.mp3'
if park.is_file():install(park,'files/parks/music.mp3')
print('Verified new park soundtrack.')
# A previous AAC cache must not shadow the newly installed soundtrack. Preserve it for recovery.
try: adb('shell','run-as',pkg,'mv','files/parks/music.m4a','files/parks/music.previous.m4a')
except subprocess.CalledProcessError: pass
