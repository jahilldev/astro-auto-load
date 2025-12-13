import { getLoaderData, type Loader } from '../src/runtime.js';

type MyLoader = () => Promise<{ name: string; age: number }>;
type Data = Loader<MyLoader>;

async function test() {
  const data = await getLoaderData<Data>();
  // Check type here
  if (data) {
    console.log(data.name, data.age);
  }
}
