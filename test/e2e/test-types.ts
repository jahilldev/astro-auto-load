import { getLoaderData, type Loader } from 'astro-auto-load/runtime';

type MyLoader = () => Promise<{ name: string; age: number }>;
type Data = Loader<MyLoader>;

async function test() {
  const data = await getLoaderData<Data>();
  // Hover over data here should show: const data: Data | undefined
  if (data) {
    console.log(data.name, data.age);
  }
}
