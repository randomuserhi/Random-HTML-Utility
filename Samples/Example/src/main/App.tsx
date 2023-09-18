import Button from "./Button";
import { useState, vof, expr } from "rhu";

const App = () => (
    <div>
        <Button>Click 11</Button>
        <Button>Click 12</Button>
        <Button>Click 13</Button>
    </div>
);

const rootElement = document.getElementById("root");
rootElement!.appendChild(<App />);

const [count, setCount] = useState<number>(10);
// count: [[object StateObject]] -> valueOf 10

// does not update when count state changes
let static_expression_0 = count + 10; // 20
console.log(static_expression_0);
let static_expression_1 = count == 10; // true
console.log(static_expression_1);
let static_expression_2 = count === 10; // false
console.log(static_expression_2);
let static_expression_3 = vof(count.valueOf()) === 10; // true
console.log(static_expression_3);
let test = count.valueOf();
console.log(test);
console.log(+test); // 10;
let static_expression_4 = vof(count) === 10; // true (vof is rhu function for valueOf)
console.log(static_expression_4);

// update when count state changes
setCount((c) => c + 1);
console.log(+test); // 11;
let dynamic_expression_0 = expr(() => count + 1); // [[object StateObject]] -> valueOf 12
console.log(+dynamic_expression_0);
let dynamic_expression_1 = expr(() => count == 11); // [[object StateObject]] -> valueOf true
console.log(+dynamic_expression_1);
let dynamic_expression_2 = expr(() => count === 11); // [[object StateObject]] -> valueOf false
console.log(+dynamic_expression_2);
let dynamic_expression_3 = expr(() => vof(count.valueOf()) === 11); // [[object StateObject]] -> valueOf true
console.log(+dynamic_expression_3);
let dynamic_expression_4 = expr(() => vof(count) === 11); // [[object StateObject]] -> valueOf true (vof is rhu function for valueOf)
console.log(+dynamic_expression_4);

export default App;