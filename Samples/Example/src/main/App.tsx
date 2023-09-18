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
let bruh = count.valueOf;
console.log(vof(bruh));
console.log(vof(bruh).call(vof(count)));
//withStates(({ count }) => console.log(vof(bruh).call(count)), { count }); // Error without `withStates` since count is a state object not actually a number so needs to get vof'd
const [obj, setObj] = useState<{ x: number }>({ x: 13 });
console.log(obj.x);
console.log(obj.x.valueOf);
console.log(vof(obj.x));
console.log(obj.x.valueOf());
console.log(vof(obj.x.valueOf()));
const b = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
console.log(b[obj.x]);
console.log(b[count]);
let strun = vof(count.toString()) === "10"; // true
console.log(strun);
let testStrun = count.toString();
console.log(testStrun);
console.log(+testStrun); // 10;
let asdas = count.toString;
//console.log(asdas()); // creates a state for the function toString
//console.log(vof(asdas())); // calls the function for the state toString => this errors since toString requires `this`
console.log(asdas);
console.log(asdas.call(vof(count))); // creates a state for the function toString.call(vof(count)) -> if you don't vof count it does toString on the state which errors since it requires `this`
console.log(vof(asdas.call(vof(count))));
console.log(vof(asdas).call(vof(count)));

// update when count state changes
setCount((c) => c + 1);
console.log(+test); // 10;
console.log(+testStrun); // 11;
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