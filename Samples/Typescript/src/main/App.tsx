import Button from "./Button";
import * as rhu from "rhu";

const App = () => (
    <div>
        <Button>Click 11</Button>
        <Button>Click 12</Button>
        <Button>Click 13</Button>
    </div>
);

const rootElement = document.getElementById("root");
rootElement!.appendChild(<App />);

rhu.log();

export default App;