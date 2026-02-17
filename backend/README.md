# Backend

## Environment Activation

### Using Poetry 2.0+
Since `poetry shell` is a plugin now, you can install it:
```bash
poetry self add poetry-plugin-shell
poetry shell
```

Or execute commands directly:
```bash
poetry run python main.py
```

Or activate the environment manually:
```bash
# Get the path
poetry env info --path
# Source it
source <path>/bin/activate
```

This is the backend for Trainer Pro.
