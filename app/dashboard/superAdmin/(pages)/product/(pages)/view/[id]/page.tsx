import { GetServerSideProps } from "next";
import prisma from "@/prisma/client"; // Assuming you have a Prisma client setup
import ProductDetail from "../_components/ProductDetail";

const ProductViewPage = async ({ params }: { params: { id: string } }) => {
  let product;

  try {
    product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        variants: {
          include: {
            skus: {
              include: {
                shopInventory: true,
                storeInventory: true,
                sellItem: {
                  include: {
                    sell: true, // Include the Sell entity
                  },
                },
              },
            },
          },
        },
        orderItem: { include: { sell: true } }, // Include the related sales information
      },
    });
  } catch (err) {
    console.error("error", err);
    product = null;
  }
  if (product == undefined) {
    return <div>not found product</div>;
  }
  return (
    <div>
      <ProductDetail product={product} />
    </div>
  );
};

export default ProductViewPage;
