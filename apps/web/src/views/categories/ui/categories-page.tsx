import { Pencil } from 'lucide-react';
import { listCategories } from '@/entities/category';
import { CategoryFormDialog } from '@/features/category/manage-category';
import { DeleteCategoryDialog } from '@/features/category/delete-category';
import { Button } from '@/shared/ui/button';
import { Table, Td, Th } from '@/shared/ui/table';
import { Header } from '@/widgets/header';

export async function CategoriesPage() {
  const categories = await listCategories();

  return (
    <>
      <Header title="Категории" />
      <main className="space-y-4 p-6">
        <div className="flex justify-end">
          <CategoryFormDialog trigger={<Button>Добавить категорию</Button>} />
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Название</Th>
              <Th>Цвет</Th>
              <Th className="w-0">
                <span className="sr-only">Действия</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <Td colSpan={3} className="text-center text-muted-foreground">
                  Категорий пока нет
                </Td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id}>
                  <Td>{category.name}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="size-4 rounded-full border border-border"
                        style={{ backgroundColor: category.color ?? undefined }}
                      />
                      {category.color ?? '—'}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <CategoryFormDialog
                        category={category}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Редактировать категорию «${category.name}»`}
                          >
                            <Pencil />
                          </Button>
                        }
                      />
                      <DeleteCategoryDialog categoryId={category.id} categoryName={category.name} />
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </main>
    </>
  );
}
