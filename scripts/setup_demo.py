"""Generate ignored local secrets and demo credentials; never overwrite an existing environment."""
import argparse
from pathlib import Path
import secrets

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa


def setup(env_file='.env', port=8080, key_dir=None, extend=False):
    root = Path(__file__).resolve().parents[1]
    target = (root/env_file).resolve()
    existing_text = target.read_text(encoding='utf-8') if target.exists() else ''
    existing_values = dict(line.split('=',1) for line in existing_text.splitlines()
                           if '=' in line and not line.lstrip().startswith('#'))
    directory = (root/(key_dir or existing_values.get('OELP_SECRET_DIR','.secrets').strip('"').strip("'"))).resolve()
    if not target.is_relative_to(root) or not directory.is_relative_to(root):
        raise ValueError('Keep local environment and secrets inside the ignored repository paths.')
    if target.name != '.env' and not target.name.startswith('.env.'):
        raise ValueError('Environment file must be .env or .env.<name>.')
    if directory.relative_to(root).parts[0] != '.secrets':
        raise ValueError('Keys must be stored under ignored .secrets/.')
    if target.exists() and not extend:
        raise FileExistsError(f'{target.name} already exists; inspect it and add missing variables manually. No data changed.')
    private_path, public_path = directory/'jwt-private.pem', directory/'jwt-public.pem'
    if private_path.exists() or public_path.exists():
        if not private_path.is_file() or not public_path.is_file():
            raise RuntimeError('Incomplete key pair. Preserve it and repair manually; no key was overwritten.')
        existing = serialization.load_pem_private_key(private_path.read_bytes(),password=None)
        public = existing.public_key().public_bytes(serialization.Encoding.PEM,serialization.PublicFormat.SubjectPublicKeyInfo)
        if public != public_path.read_bytes():
            raise RuntimeError('Public/private keys do not match. No data changed.')
    else:
        directory.mkdir(parents=True,exist_ok=True)
        directory.chmod(0o700)
        key = rsa.generate_private_key(public_exponent=65537,key_size=2048)
        private_path.write_bytes(key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
        public_path.write_bytes(key.public_key().public_bytes(serialization.Encoding.PEM,serialization.PublicFormat.SubjectPublicKeyInfo))
        # The private .secrets directory remains owner-only. The file itself must
        # be readable by the non-root appuser when Compose mounts it as a secret.
        private_path.chmod(0o644)
        public_path.chmod(0o644)
    directory.chmod(0o700)
    template = (root/'.env.example').read_text(encoding='utf-8')
    output = []
    for line in template.splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            name,value = line.split('=',1)
            if name in existing_values:
                continue
            if value.startswith('CHANGE_ME'):
                value = secrets.token_urlsafe(32)
            elif name == 'NGINX_HOST_PORT':
                value = str(port)
            elif name == 'OELP_SECRET_DIR':
                value = directory.relative_to(root).as_posix()
            elif name == 'SEED_DEMO' and existing_values.get('DEMO_MODE','true').strip().lower() == 'false':
                value = 'false'
            line = name+'='+value
        if not existing_text or ('=' in line and not line.lstrip().startswith('#')):
            output.append(line)
    if existing_text and not output:
        print(f'{target.name} already has every variable; existing values and keys were kept.')
        return
    combined = (existing_text.rstrip('\n')+'\n\n# Variables added without changing existing values.\n' if existing_text else '')
    target.write_text(combined+'\n'.join(output)+'\n',encoding='utf-8',newline='\n')
    target.chmod(0o600)
    print(f'Prepared {target.name} and local signing keys. Existing values were preserved. Open the ignored env file for demo credentials; no secrets printed.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--env-file',default='.env')
    parser.add_argument('--port',type=int,default=8080)
    parser.add_argument('--key-dir')
    parser.add_argument('--extend',action='store_true',help='Only append missing variables; never replace existing credentials.')
    args = parser.parse_args()
    setup(args.env_file,args.port,args.key_dir,args.extend)
