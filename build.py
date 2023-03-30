if __name__ == "__main__":
    from pathlib import Path
    from subprocess import call
    import shutil
    import os

    build = "./build"
    RHU = "./RHU"

    if os.path.exists(build):
        shutil.rmtree(build)

    for file in Path(RHU).glob('**/*.js'):
        buildPath = Path(f"build\\{file.parent}\\{file.stem}.js")
        buildPath.parent.mkdir(exist_ok=True, parents=True)
        command = " ".join(["minify", f"{file.parent}\\{file.stem}.js", ">", f"build\\{file.parent}\\{file.stem}.js"])
        print(command)
        os.system(command)