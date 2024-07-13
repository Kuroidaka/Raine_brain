export function assert(condition: boolean, message="while assert inputText should be equal to inputText2") {
    if (!condition) {
        throw new Error(message);
    }
}
