'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Page,
  Layout,
  Card,
  Form,
  FormLayout,
  TextField,
  Button,
  Text,
  BlockStack,
  InlineStack,
  Thumbnail,
  Banner,
  Badge,
  Box,
  Divider,
  Checkbox,
  Modal,
  ButtonGroup,
  Icon,
  Select,
  ProgressBar,
} from '@shopify/polaris';
import { EditIcon } from '@shopify/polaris-icons';

interface ProductData {
  title: string;
  price: string;
  description: string;
  images: string[];
  variants?: Array<{
    title?: string;
    price?: string;
    sku?: string;
    inventory_quantity?: number;
  }>;
}

interface EditingFields {
  title: boolean;
  price: boolean;
  description: boolean;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [editedProductData, setEditedProductData] = useState<ProductData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedImages, setSelectedImages] = useState<{[key: string]: boolean}>({});
  const [inlineEditing, setInlineEditing] = useState<EditingFields>({
    title: false,
    price: false,
    description: false
  });
  const [storeType, setStoreType] = useState('vtex');
  const [importProgress, setImportProgress] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setImportProgress(0);

    try {
      // Atualizar o progresso para feedback visual
      setImportProgress(20);
      
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, storeType }),
      });

      setImportProgress(60);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error scraping product');
      }

      // Inicializar todas as imagens como selecionadas
      const initialSelectedImages: {[key: string]: boolean} = {};
      data.images.forEach((image: string, index: number) => {
        initialSelectedImages[index] = true;
      });
      setSelectedImages(initialSelectedImages);

      setProductData(data);
      setEditedProductData(data);
      setImportProgress(100);
      toast.success('Dados do produto extraídos com sucesso!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Falha ao extrair dados do produto';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error(error);
      setImportProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const importToShopify = async () => {
    if (!editedProductData) return;
    setImporting(true);
    setImportProgress(0);

    try {
      // Filtrar apenas as imagens selecionadas
      const selectedImagesArray = editedProductData.images.filter((_, index) => 
        selectedImages[index]
      );

      // Criar o objeto de produto com as imagens selecionadas
      const productToImport = {
        ...editedProductData,
        images: selectedImagesArray
      };

      setImportProgress(30);

      const response = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productToImport),
      });

      setImportProgress(70);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao importar para o Shopify');
      }

      setImportProgress(100);
      
      // Verificar diferentes formatos de resposta possíveis
      let successMessage = 'Produto importado para o Shopify com sucesso!';
      if (data.success) {
        successMessage += ' ID do Produto: ' + (data.productId || 'Criado');
      }
      
      toast.success(successMessage);
      console.log('Resposta da importação:', data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Falha ao importar para o Shopify';
      toast.error(errorMessage);
      console.error('Erro na importação:', error);
      setImportProgress(0);
    } finally {
      setImporting(false);
    }
  };

  // Formatar o preço para exibição
  const formatPrice = (price: string) => {
    if (!price) return 'R$ 0,00';
    
    // Converter para número
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return 'R$ 0,00';
    
    // Formatar com 2 casas decimais e separador de milhares
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numPrice);
  };

  const toggleImageSelection = (index: number) => {
    setSelectedImages({
      ...selectedImages,
      [index]: !selectedImages[index]
    });
  };

  const handleEditField = (field: keyof ProductData, value: string) => {
    if (editedProductData) {
      setEditedProductData({
        ...editedProductData,
        [field]: value
      });
    }
  };

  const toggleInlineEditing = (field: keyof EditingFields) => {
    setInlineEditing({
      ...inlineEditing,
      [field]: !inlineEditing[field]
    });
  };

  return (
    <Page
      title="Importador de Produtos VTEX para Shopify"
      primaryAction={
        productData && {
          content: "Importar para Shopify",
          onAction: importToShopify,
          loading: importing,
          disabled: importing
        }
      }
    >
      <BlockStack gap="500">
        {error && (
          <Banner
            title="Erro ao processar a solicitação"
            tone="critical"
            onDismiss={() => setError(null)}
          >
            <p>{error}</p>
          </Banner>
        )}

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Insira a URL do produto
            </Text>
            <Form onSubmit={handleSubmit}>
              <FormLayout>
                <Select
                  label="Tipo de loja"
                  options={[
                    {label: 'VTEX', value: 'vtex'},
                    {label: 'Outro', value: 'other'}
                  ]}
                  value={storeType}
                  onChange={setStoreType}
                  helpText="Selecione VTEX para melhor extração de dados"
                />
                <TextField
                  label="URL do produto"
                  value={url}
                  onChange={setUrl}
                  autoComplete="off"
                  placeholder="https://loja.vtex.com/produto/nome-do-produto"
                  helpText="Cole a URL completa do produto que deseja importar"
                />
                <Button submit loading={loading} disabled={loading}>
                  Extrair dados do produto
                </Button>
                {(loading || importing) && importProgress > 0 && (
                  <Box paddingBlock="300">
                    <ProgressBar progress={importProgress} size="small" />
                    <Text as="p" variant="bodySm" alignment="center">
                      {loading ? 'Extraindo dados...' : 'Importando para Shopify...'}
                    </Text>
                  </Box>
                )}
              </FormLayout>
            </Form>
          </BlockStack>
        </Card>

        {productData && editedProductData && (
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text as="h2" variant="headingMd">
                  Dados do produto
                </Text>
                <ButtonGroup>
                  <Button
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? 'Concluir edição' : 'Editar todos os campos'}
                  </Button>
                </ButtonGroup>
              </InlineStack>

              <Divider />

              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  {inlineEditing.title ? (
                    <TextField
                      label="Título"
                      labelHidden
                      value={editedProductData.title}
                      onChange={(value) => handleEditField('title', value)}
                      autoComplete="off"
                      connectedRight={
                        <Button onClick={() => toggleInlineEditing('title')}>
                          Salvar
                        </Button>
                      }
                    />
                  ) : (
                    <>
                      <BlockStack>
                        <Text as="h3" variant="headingMd">
                          {editedProductData.title || 'Sem título'}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Título do produto
                        </Text>
                      </BlockStack>
                      <Button
                        icon={<Icon source={EditIcon} />}
                        onClick={() => toggleInlineEditing('title')}
                      >
                        Editar
                      </Button>
                    </>
                  )}
                </InlineStack>

                <Divider />

                <InlineStack align="space-between" blockAlign="center">
                  {inlineEditing.price ? (
                    <TextField
                      label="Preço"
                      labelHidden
                      value={editedProductData.price}
                      onChange={(value) => handleEditField('price', value)}
                      autoComplete="off"
                      connectedRight={
                        <Button onClick={() => toggleInlineEditing('price')}>
                          Salvar
                        </Button>
                      }
                    />
                  ) : (
                    <>
                      <BlockStack>
                        <Text as="h3" variant="headingLg">
                          {formatPrice(editedProductData.price)}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Preço do produto
                        </Text>
                      </BlockStack>
                      <Button
                        icon={<Icon source={EditIcon} />}
                        onClick={() => toggleInlineEditing('price')}
                      >
                        Editar
                      </Button>
                    </>
                  )}
                </InlineStack>

                <Divider />

                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingMd">
                      Descrição
                    </Text>
                    <Button
                      icon={<Icon source={EditIcon} />}
                      onClick={() => toggleInlineEditing('description')}
                    >
                      Editar
                    </Button>
                  </InlineStack>
                  
                  {inlineEditing.description ? (
                    <TextField
                      label="Descrição"
                      labelHidden
                      value={editedProductData.description}
                      onChange={(value) => handleEditField('description', value)}
                      autoComplete="off"
                      multiline={4}
                      connectedRight={
                        <Button onClick={() => toggleInlineEditing('description')}>
                          Salvar
                        </Button>
                      }
                    />
                  ) : (
                    <Box paddingBlock="200">
                      <Text as="p">
                        {editedProductData.description || 'Sem descrição'}
                      </Text>
                    </Box>
                  )}
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    Imagens ({Object.values(selectedImages).filter(Boolean).length} selecionadas)
                  </Text>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                    {editedProductData.images.map((image, index) => (
                      <div key={index} style={{ position: 'relative', width: '120px' }}>
                        <div 
                          style={{ 
                            opacity: selectedImages[index] ? 1 : 0.5,
                            border: selectedImages[index] ? '2px solid #008060' : '2px solid transparent',
                            borderRadius: '8px',
                            overflow: 'hidden'
                          }}
                        >
                          <Thumbnail
                            source={image}
                            alt={`Product image ${index + 1}`}
                            size="large"
                          />
                        </div>
                        <div style={{ marginTop: '8px' }}>
                          <Checkbox
                            label="Selecionar"
                            labelHidden
                            checked={selectedImages[index]}
                            onChange={() => toggleImageSelection(index)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </BlockStack>
              </BlockStack>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}
