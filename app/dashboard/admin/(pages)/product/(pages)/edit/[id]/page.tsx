import React from "react";
import prisma from "@/prisma/client";
import AddProductForm from "../../add/_components/AddProductForm";

const EditProductPage = async ({ params }: { params: { id: string } }) => {
  let product;

  try {
     product = await prisma.product.findUnique({
        where: { id: params.id },
        include: {
          variants: {
            include: {
              skus: {
                include: {
                  shopInventory: true,
                  storeInventory: true,
                },
              },
            },
          },
        },
      });
      
  } catch (err) {
    console.error("error", err);
    product = null;
  }
  // Convert null to undefined if necessary
  if (product == undefined) {
    return <div>not found product</div>;
  }

  return <AddProductForm product={product} />;
};

export default EditProductPage;